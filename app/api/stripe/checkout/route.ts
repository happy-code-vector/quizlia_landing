import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Stripe checkout session creation
export async function POST(request: NextRequest) {
  try {
    const { priceId, profileId, planId } = await request.json();

    // Check if Stripe secret key is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // Demo mode - simulate successful checkout
      return NextResponse.json({
        url: `/note/subscription/success?session_id=demo_${Date.now()}&profile_id=${profileId}&plan_id=${planId}`,
        demo: true,
      });
    }

    // Initialize Stripe (dynamic import to avoid issues if not installed)
    const stripe = require("stripe")(stripeSecretKey);

    // Get the origin for redirect URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/note/subscription/success?session_id={CHECKOUT_SESSION_ID}&profile_id=${profileId}`,
      cancel_url: `${origin}/note?canceled=true`,
      metadata: {
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
