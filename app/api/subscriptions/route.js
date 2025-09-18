// Subscription Management API
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth.js"
import { stripe, SUBSCRIPTION_PLANS } from "../../../lib/stripe/config.js"
import { ObjectId } from "mongodb"

const authService = new AuthService()

// GET /api/subscriptions - Get user's current subscription
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { db } = await connectToDatabase()
    const users = db.collection("users")

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const subscription = user.subscription || { plan: "free" }
    const planDetails = SUBSCRIPTION_PLANS[subscription.plan] || SUBSCRIPTION_PLANS.free

    // If user has Stripe subscription, get latest info
    let stripeSubscription = null
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
      } catch (error) {
        console.error("Error fetching Stripe subscription:", error)
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        planDetails,
        stripeStatus: stripeSubscription?.status,
        currentPeriodEnd: stripeSubscription?.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : null,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/subscriptions - Create or update subscription
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()
    const { planId, paymentMethodId } = body

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 })
    }

    if (planId === "free") {
      return NextResponse.json({ error: "Cannot create subscription for free plan" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const users = db.collection("users")

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const plan = SUBSCRIPTION_PLANS[planId]

    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: decoded.userId,
        },
      })
      customerId = customer.id

      // Update user with customer ID
      await users.updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            "subscription.stripeCustomerId": customerId,
          },
        },
      )
    }

    // Attach payment method to customer
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: plan.stripePriceId,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    })

    // Update user subscription in database
    await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          "subscription.plan": planId,
          "subscription.stripeSubscriptionId": subscription.id,
          "subscription.status": subscription.status,
          "subscription.startDate": new Date(),
          "subscription.endDate": new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      message: "Subscription created successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
