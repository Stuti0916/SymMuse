// Stripe Configuration and Setup
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free Plan",
    price: 0,
    interval: null,
    features: {
      periodTracking: true,
      basicMoodTracking: true,
      communityAccess: true,
      consultationsPerMonth: 1,
      dataExport: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customReminders: false,
    },
  },
  premium: {
    id: "premium",
    name: "Premium Plan",
    price: 9.99,
    interval: "month",
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      periodTracking: true,
      basicMoodTracking: true,
      advancedMoodTracking: true,
      communityAccess: true,
      consultationsPerMonth: 5,
      dataExport: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customReminders: true,
      symptomPredictions: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    price: 19.99,
    interval: "month",
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      periodTracking: true,
      basicMoodTracking: true,
      advancedMoodTracking: true,
      communityAccess: true,
      consultationsPerMonth: -1, // Unlimited
      dataExport: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customReminders: true,
      symptomPredictions: true,
      personalizedInsights: true,
      telehealth: true,
    },
  },
}

export { stripe }

// Helper function to get user's subscription features
export function getUserFeatures(subscriptionPlan) {
  return SUBSCRIPTION_PLANS[subscriptionPlan]?.features || SUBSCRIPTION_PLANS.free.features
}

// Helper function to check if user has access to a feature
export function hasFeatureAccess(userPlan, featureName) {
  const features = getUserFeatures(userPlan)
  return features[featureName] === true || features[featureName] === -1 // -1 means unlimited
}

// Helper function to get consultation limit
export function getConsultationLimit(userPlan) {
  const features = getUserFeatures(userPlan)
  return features.consultationsPerMonth
}
