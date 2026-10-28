import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyIdToken } from "@/lib/token-verify";

export const dynamic = 'force-dynamic';

// Stripe checkout session creation
export async function POST(request: NextRequest) {
  try {
    // planId is NEVER taken from the body for the real checkout — the demo
    // branch below is its only consumer (no money moves in demo mode).
    const { priceId, profileId, planId: demoPlanId } = await request.json();

    // Trial length by plan, mirroring the iOS intro offers (discountyearly
    // = 7-day Individual; yearly = 3-day Family; none on weekly).
    const trialDaysByPlan: Record<string, number> = {
      individual_yearly: 7,
      family_yearly: 3,
    };

    // Check if Stripe secret key is configured and a real price ID was set
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || !priceId) {
      // Demo mode - simulate successful checkout
      return NextResponse.json({
        url: `/note/subscription/success?session_id=demo_${Date.now()}&profile_id=${profileId}&plan_id=${demoPlanId}`,
        demo: true,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey);

    // Real checkout requires a verified signed-in user — the webhook
    // writes subscriptions for this uid later (spec §5.6).
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const caller = idToken ? await verifyIdToken(idToken) : null;
    if (!caller) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    // Derive the plan from the priceId SERVER-SIDE (final-review Critical #1:
    // a client-supplied planId rode unvalidated into the webhook's
    // authoritative write — cheapest-price + family-planId = zero-payment
    // family tier). The body's planId is never trusted.
    const priceToPlan: Record<string, string> = {};
    if (process.env.NEXT_PUBLIC_STRIPE_PRICE_WEEKLY) {
      priceToPlan[process.env.NEXT_PUBLIC_STRIPE_PRICE_WEEKLY] = "weekly";
    }
    if (process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_YEARLY) {
      priceToPlan[process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_YEARLY] = "individual_yearly";
    }
    if (process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY) {
      priceToPlan[process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_YEARLY] = "family_yearly";
    }
    const planId = priceToPlan[priceId];
    if (!planId) {
      return NextResponse.json({ error: "Unknown price" }, { status: 400 });
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: trialDaysByPlan[planId]
        ? { trial_period_days: trialDaysByPlan[planId] }
        : undefined,
      success_url: `${origin}/note/subscription/success?session_id={CHECKOUT_SESSION_ID}&profile_id=${profileId}`,
      cancel_url: `${origin}/note?canceled=true`,
      metadata: {
        uid: caller.uid,
        profileId: String(profileId),
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
