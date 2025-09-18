// Stripe Webhooks Handler
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/database/mongodb.js"
import { stripe } from "../../../../lib/stripe/config.js"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// POST /api/webhooks/stripe - Handle Stripe webhooks
export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
    }

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error("Webhook signature verification failed:", error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const users = db.collection("users")

    // Handle different webhook events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object, users)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionCancellation(event.data.object, users)
        break

      case "invoice.payment_succeeded":
        await handlePaymentSuccess(event.data.object, users)
        break

      case "invoice.payment_failed":
        await handlePaymentFailure(event.data.object, users)
        break

      case "customer.subscription.trial_will_end":
        await handleTrialEnding(event.data.object, users)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper functions for webhook handling
async function handleSubscriptionUpdate(subscription, usersCollection) {
  const customerId = subscription.customer
  const user = await usersCollection.findOne({ "subscription.stripeCustomerId": customerId })

  if (!user) {
    console.error("User not found for customer:", customerId)
    return
  }

  // Determine plan based on subscription
  let planId = "free"
  if (subscription.items?.data?.[0]?.price?.id) {
    const priceId = subscription.items.data[0].price.id
    // Map price ID to plan ID
    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) planId = "premium"
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) planId = "pro"
  }

  await usersCollection.updateOne(
    { _id: user._id },
    {
      $set: {
        "subscription.plan": planId,
        "subscription.stripeSubscriptionId": subscription.id,
        "subscription.status": subscription.status,
        "subscription.startDate": new Date(subscription.current_period_start * 1000),
        "subscription.endDate": new Date(subscription.current_period_end * 1000),
        "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    },
  )

  console.log(`Updated subscription for user ${user._id} to plan ${planId}`)
}

async function handleSubscriptionCancellation(subscription, usersCollection) {
  const customerId = subscription.customer
  const user = await usersCollection.findOne({ "subscription.stripeCustomerId": customerId })

  if (!user) {
    console.error("User not found for customer:", customerId)
    return
  }

  await usersCollection.updateOne(
    { _id: user._id },
    {
      $set: {
        "subscription.plan": "free",
        "subscription.status": "cancelled",
        "subscription.endDate": new Date(),
        updatedAt: new Date(),
      },
    },
  )

  console.log(`Cancelled subscription for user ${user._id}`)
}

async function handlePaymentSuccess(invoice, usersCollection) {
  const customerId = invoice.customer
  const user = await usersCollection.findOne({ "subscription.stripeCustomerId": customerId })

  if (!user) return

  // Create payment record
  const payments = usersCollection.db.collection("payments")
  await payments.insertOne({
    userId: user._id,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid / 100, // Convert from cents
    currency: invoice.currency,
    status: "succeeded",
    paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    createdAt: new Date(),
  })

  console.log(`Payment succeeded for user ${user._id}, amount: ${invoice.amount_paid / 100}`)
}

async function handlePaymentFailure(invoice, usersCollection) {
  const customerId = invoice.customer
  const user = await usersCollection.findOne({ "subscription.stripeCustomerId": customerId })

  if (!user) return

  // Create notification for payment failure
  const notifications = usersCollection.db.collection("notifications")
  await notifications.insertOne({
    userId: user._id,
    type: "payment_failed",
    title: "Payment Failed",
    message: "Your subscription payment failed. Please update your payment method.",
    isRead: false,
    createdAt: new Date(),
  })

  console.log(`Payment failed for user ${user._id}`)
}

async function handleTrialEnding(subscription, usersCollection) {
  const customerId = subscription.customer
  const user = await usersCollection.findOne({ "subscription.stripeCustomerId": customerId })

  if (!user) return

  // Create notification for trial ending
  const notifications = usersCollection.db.collection("notifications")
  await notifications.insertOne({
    userId: user._id,
    type: "trial_ending",
    title: "Trial Ending Soon",
    message: "Your free trial will end in 3 days. Upgrade to continue enjoying premium features.",
    isRead: false,
    createdAt: new Date(),
  })

  console.log(`Trial ending notification sent to user ${user._id}`)
}
