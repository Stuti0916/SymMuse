// Premium Feature Access Control
import { connectToDatabase } from "../database/mongodb.js"
import { getUserFeatures, hasFeatureAccess, getConsultationLimit } from "../stripe/config.js"
import { ObjectId } from "mongodb"

export class PremiumAccessControl {
  static async checkFeatureAccess(userId, featureName) {
    try {
      const { db } = await connectToDatabase()
      const users = db.collection("users")

      const user = await users.findOne({ _id: new ObjectId(userId) })
      if (!user) {
        throw new Error("User not found")
      }

      const userPlan = user.subscription?.plan || "free"
      return hasFeatureAccess(userPlan, featureName)
    } catch (error) {
      console.error("Error checking feature access:", error)
      return false
    }
  }

  static async checkConsultationLimit(userId) {
    try {
      const { db } = await connectToDatabase()
      const users = db.collection("users")
      const consultations = db.collection("consultations")

      const user = await users.findOne({ _id: new ObjectId(userId) })
      if (!user) {
        throw new Error("User not found")
      }

      const userPlan = user.subscription?.plan || "free"
      const limit = getConsultationLimit(userPlan)

      if (limit === -1) {
        return { allowed: true, remaining: -1 } // Unlimited
      }

      // Count consultations this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const consultationsThisMonth = await consultations.countDocuments({
        userId: new ObjectId(userId),
        createdAt: { $gte: startOfMonth },
        status: { $in: ["scheduled", "completed", "in_progress"] },
      })

      const remaining = Math.max(0, limit - consultationsThisMonth)

      return {
        allowed: remaining > 0,
        remaining,
        limit,
        used: consultationsThisMonth,
      }
    } catch (error) {
      console.error("Error checking consultation limit:", error)
      return { allowed: false, remaining: 0 }
    }
  }

  static async getUserPremiumStatus(userId) {
    try {
      const { db } = await connectToDatabase()
      const users = db.collection("users")

      const user = await users.findOne({ _id: new ObjectId(userId) })
      if (!user) {
        throw new Error("User not found")
      }

      const subscription = user.subscription || { plan: "free" }
      const features = getUserFeatures(subscription.plan)

      return {
        plan: subscription.plan,
        features,
        isActive: subscription.status === "active" || subscription.plan === "free",
        endDate: subscription.endDate,
      }
    } catch (error) {
      console.error("Error getting premium status:", error)
      return {
        plan: "free",
        features: getUserFeatures("free"),
        isActive: true,
        endDate: null,
      }
    }
  }

  // Middleware function to protect premium routes
  static premiumMiddleware(requiredFeature) {
    return async (req, res, next) => {
      try {
        const userId = req.userId // Assumes auth middleware has set this

        if (!userId) {
          return res.status(401).json({ error: "Authentication required" })
        }

        const hasAccess = await this.checkFeatureAccess(userId, requiredFeature)

        if (!hasAccess) {
          return res.status(403).json({
            error: "Premium feature access required",
            feature: requiredFeature,
            upgradeRequired: true,
          })
        }

        next()
      } catch (error) {
        return res.status(500).json({ error: "Error checking premium access" })
      }
    }
  }
}

// Helper function for API routes
export async function requirePremiumFeature(userId, featureName) {
  const hasAccess = await PremiumAccessControl.checkFeatureAccess(userId, featureName)

  if (!hasAccess) {
    throw new Error(`Premium feature '${featureName}' access required`)
  }

  return true
}
