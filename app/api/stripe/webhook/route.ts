import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/admin-firestore";

export const dynamic = 'force-dynamic';

// Server-authoritative subscription write (spec §5.6) — the ONLY writer
// besides /api/ios/entitlements; clients lost write access in Task 6.
async function writeSubscription(
  subscriptionId: string,
  uid: string,
  planId: string,
  active: boolean
): Promise<void> {
  const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const db = await getAdminDb();
  await db.collection("users").doc(uid).set(
    {
      [`subscriptions.${planId}.active`]: active,
      ...(active && { [`subscriptions.${planId}.renewalDate`]: renewalDate }),
    },
    { merge: true }
  );
  console.log(`Subscription ${subscriptionId} → users/${uid}.${planId}.active=${active}`);
}

// Stripe webhook handler for subscription events
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.log("Stripe not configured, skipping webhook");
    return NextResponse.json({ received: true });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.uid;
        const planId = session.metadata?.planId;
        if (!uid || !planId || !session.subscription) {
          console.error("Webhook: session missing uid/planId/subscription", session.id);
          break;
        }
        // Map subscription → uid so lifecycle events resolve the account.
        const db = await getAdminDb();
        await db.collection("stripeSubscriptions").doc(String(session.subscription)).set(
          { uid, planId, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        await writeSubscription(String(session.subscription), uid, planId, true);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const db = await getAdminDb();
        const mapping = await db
          .collection("stripeSubscriptions")
          .doc(subscription.id)
          .get();
        const { uid, planId } = mapping.data() ?? {};
        if (!uid || !planId) {
          console.log("Webhook: no mapping for subscription", subscription.id);
          break;
        }
        const active =
          event.type === "customer.subscription.updated" &&
          (subscription.status === "active" || subscription.status === "trialing");
        await writeSubscription(subscription.id, uid, planId, active);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed:", invoice.id);
        break;
      }
      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
