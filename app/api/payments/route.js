// Payment Processing API
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth"
import { stripe } from "../../../lib/stripe/config.js"
import { ObjectId } from "mongodb"

const authService = new AuthService()

// GET /api/payments - Get user's payment history
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { db } = await connectToDatabase()
    const payments = db.collection("payments")

    const userPayments = await payments
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      payments: userPayments,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/payments - Process one-time payment (for consultations)
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()
    const { amount, currency = "usd", description, consultationId, paymentMethodId } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const users = db.collection("users")

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

      await users.updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            "subscription.stripeCustomerId": customerId,
          },
        },
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      description: description || "SymMuse consultation payment",
      metadata: {
        userId: decoded.userId,
        consultationId: consultationId || "",
      },
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
    })

    // Create payment record
    const payments = db.collection("payments")
    await payments.insertOne({
      userId: new ObjectId(decoded.userId),
      stripePaymentIntentId: paymentIntent.id,
      consultationId: consultationId ? new ObjectId(consultationId) : null,
      amount,
      currency,
      status: paymentIntent.status,
      description,
      createdAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
