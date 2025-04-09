import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil", // Updated to your specified version
});

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  // Debug logging
  console.log("Webhook request details:", {
    signature: sig,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
    bodySnippet: body.substring(0, 100),
    bodyLength: body.length,
  });

  if (!sig) {
    console.error("Missing Stripe-Signature header");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(
      "Webhook signature verification failed:",
      (err as Error).message
    );
    return NextResponse.json(
      { error: "Webhook signature invalid" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_email;

    if (!userEmail) {
      console.error("No customer email in session");
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    const cookieStore = await cookies(); // Fixed: await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (userError || !userData) {
      console.error("User not found for email:", userEmail, userError?.message);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ subscription: "paid" })
      .eq("id", userData.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    console.log(`Updated subscription to "paid" for user: ${userData.id}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
