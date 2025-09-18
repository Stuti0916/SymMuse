// Subscription Cancellation API
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../lib/auth/auth.js"
import { stripe } from "../../../../lib/stripe/config.js"
import { ObjectId } from "mongodb"

const authService = new AuthService()

// POST /api/subscriptions/cancel - Cancel user's subscription
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()
    const { cancelImmediately = false } = body

    const { db } = await connectToDatabase()
    const users = db.collection("users")

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const subscription = user.subscription
    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
    }

    // Cancel subscription in Stripe
    let canceledSubscription
    if (cancelImmediately) {
      canceledSubscription = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    } else {
      // Cancel at period end
      canceledSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
    }

    // Update user subscription status
    const updateData = {
      "subscription.status": canceledSubscription.status,
      "subscription.cancelAtPeriodEnd": canceledSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    }

    if (cancelImmediately) {
      updateData["subscription.plan"] = "free"
      updateData["subscription.endDate"] = new Date()
    }

    await users.updateOne({ _id: new ObjectId(decoded.userId) }, { $set: updateData })

    return NextResponse.json({
      success: true,
      message: cancelImmediately
        ? "Subscription cancelled immediately"
        : "Subscription will cancel at the end of the current period",
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
