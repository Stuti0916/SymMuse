// Premium Analytics API (Advanced Analytics Feature)
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../lib/auth/auth.js"
import { requirePremiumFeature } from "../../../../lib/premium/access-control.js"
import { ObjectId } from "mongodb"

const authService = new AuthService()

// GET /api/analytics/premium - Get advanced premium analytics
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)

    // Check premium feature access
    await requirePremiumFeature(decoded.userId, "advancedAnalytics")

    const { db } = await connectToDatabase()
    const url = new URL(request.url)
    const months = Number.parseInt(url.searchParams.get("months")) || 12

    // Get comprehensive data for advanced analytics
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const [periods, moods, consultations] = await Promise.all([
      db
        .collection("periods")
        .find({
          userId: new ObjectId(decoded.userId),
          startDate: { $gte: startDate },
        })
        .sort({ startDate: -1 })
        .toArray(),

      db
        .collection("mood_tracking")
        .find({
          userId: new ObjectId(decoded.userId),
          date: { $gte: startDate },
        })
        .sort({ date: -1 })
        .toArray(),

      db
        .collection("consultations")
        .find({
          userId: new ObjectId(decoded.userId),
          createdAt: { $gte: startDate },
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ])

    // Generate advanced analytics
    const analytics = {
      cyclePredictions: generateCyclePredictions(periods),
      symptomPatterns: analyzeSymptomPatterns(moods, periods),
      moodCorrelations: analyzeMoodCorrelations(moods, periods),
      healthTrends: analyzeHealthTrends(periods, moods, consultations),
      personalizedInsights: generatePersonalizedInsights(periods, moods, consultations),
      riskAssessment: assessHealthRisks(periods, moods),
    }

    return NextResponse.json({
      success: true,
      analytics,
      dataRange: {
        startDate,
        endDate: new Date(),
        periodsCount: periods.length,
        moodEntriesCount: moods.length,
        consultationsCount: consultations.length,
      },
    })
  } catch (error) {
    if (error.message.includes("Premium feature")) {
      return NextResponse.json(
        {
          error: error.message,
          upgradeRequired: true,
          feature: "advancedAnalytics",
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Advanced analytics helper functions
function generateCyclePredictions(periods) {
  if (periods.length < 3) {
    return { available: false, message: "Need more cycle data for predictions" }
  }

  // Calculate cycle patterns and predict next 3 cycles
  const cycleLengths = []
  for (let i = 0; i < periods.length - 1; i++) {
    const current = new Date(periods[i].startDate)
    const next = new Date(periods[i + 1].startDate)
    const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
    cycleLengths.push(diffDays)
  }

  const avgLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  const lastPeriod = new Date(periods[0].startDate)

  const predictions = []
  for (let i = 1; i <= 3; i++) {
    const predictedDate = new Date(lastPeriod.getTime() + avgLength * i * 24 * 60 * 60 * 1000)
    predictions.push({
      cycle: i,
      predictedStartDate: predictedDate,
      confidence: calculatePredictionConfidence(cycleLengths),
    })
  }

  return {
    available: true,
    predictions,
    averageCycleLength: Math.round(avgLength),
  }
}

function analyzeSymptomPatterns(moods, periods) {
  const symptomsByPhase = {}
  const symptomFrequency = {}

  moods.forEach((mood) => {
    const phase = determineCyclePhase(new Date(mood.date), periods)
    if (phase) {
      if (!symptomsByPhase[phase]) symptomsByPhase[phase] = {}

      const allSymptoms = [...mood.symptoms.physical, ...mood.symptoms.emotional]
      allSymptoms.forEach((symptom) => {
        symptomsByPhase[phase][symptom] = (symptomsByPhase[phase][symptom] || 0) + 1
        symptomFrequency[symptom] = (symptomFrequency[symptom] || 0) + 1
      })
    }
  })

  return {
    byPhase: symptomsByPhase,
    frequency: symptomFrequency,
    mostCommon: Object.entries(symptomFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symptom, count]) => ({ symptom, count })),
  }
}

function analyzeMoodCorrelations(moods, periods) {
  // Analyze correlations between mood, cycle phase, and symptoms
  const correlations = {
    moodVsCyclePhase: {},
    moodVsSymptoms: {},
    sleepVsMood: calculateCorrelation(
      moods.map((m) => m.sleep.hours),
      moods.map((m) => m.mood.level),
    ),
  }

  return correlations
}

function analyzeHealthTrends(periods, moods, consultations) {
  // Analyze trends over time
  const monthlyData = {}

  // Group data by month
  periods.forEach((period) => {
    const month = new Date(period.startDate).toISOString().slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { periods: 0, moods: 0, consultations: 0 }
    monthlyData[month].periods++
  })

  moods.forEach((mood) => {
    const month = new Date(mood.date).toISOString().slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { periods: 0, moods: 0, consultations: 0 }
    monthlyData[month].moods++
  })

  consultations.forEach((consultation) => {
    const month = new Date(consultation.createdAt).toISOString().slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { periods: 0, moods: 0, consultations: 0 }
    monthlyData[month].consultations++
  })

  return {
    monthlyData,
    trends: calculateTrends(monthlyData),
  }
}

function generatePersonalizedInsights(periods, moods, consultations) {
  const insights = []

  // Cycle regularity insight
  if (periods.length >= 3) {
    const cycleLengths = []
    for (let i = 0; i < periods.length - 1; i++) {
      const current = new Date(periods[i].startDate)
      const next = new Date(periods[i + 1].startDate)
      const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
      cycleLengths.push(diffDays)
    }

    const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths)
    if (variation <= 3) {
      insights.push({
        type: "positive",
        title: "Regular Cycles",
        message: "Your cycles are very regular, which is a good sign of hormonal health.",
      })
    }
  }

  // Mood patterns insight
  if (moods.length >= 14) {
    const recentMoods = moods.slice(0, 14).map((m) => m.mood.level)
    const avgMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length

    if (avgMood >= 7) {
      insights.push({
        type: "positive",
        title: "Good Mood Stability",
        message: "Your mood has been consistently positive over the past two weeks.",
      })
    } else if (avgMood < 5) {
      insights.push({
        type: "attention",
        title: "Mood Support Needed",
        message: "Consider speaking with a healthcare provider about mood support strategies.",
      })
    }
  }

  return insights
}

function assessHealthRisks(periods, moods) {
  const risks = []

  // Irregular cycle risk
  if (periods.length >= 3) {
    const cycleLengths = []
    for (let i = 0; i < periods.length - 1; i++) {
      const current = new Date(periods[i].startDate)
      const next = new Date(periods[i + 1].startDate)
      const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
      cycleLengths.push(diffDays)
    }

    const avgLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
    if (avgLength < 21 || avgLength > 35) {
      risks.push({
        level: "medium",
        category: "cycle_health",
        message: "Cycle length outside normal range - consider consulting a healthcare provider",
      })
    }
  }

  return risks
}

// Helper functions
function calculatePredictionConfidence(cycleLengths) {
  const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths)
  if (variation <= 3) return "high"
  if (variation <= 7) return "medium"
  return "low"
}

function determineCyclePhase(date, periods) {
  const relevantPeriod = periods.find((p) => new Date(p.startDate) <= date)
  if (!relevantPeriod) return null

  const daysSincePeriod = Math.floor((date - new Date(relevantPeriod.startDate)) / (1000 * 60 * 60 * 24))

  if (daysSincePeriod <= 5) return "menstrual"
  if (daysSincePeriod <= 13) return "follicular"
  if (daysSincePeriod <= 16) return "ovulation"
  if (daysSincePeriod <= 28) return "luteal"

  return null
}

function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  return denominator === 0 ? 0 : numerator / denominator
}

function calculateTrends(monthlyData) {
  // Simple trend calculation - could be enhanced with more sophisticated algorithms
  const months = Object.keys(monthlyData).sort()
  if (months.length < 2) return {}

  const trends = {}
  const metrics = ["periods", "moods", "consultations"]

  metrics.forEach((metric) => {
    const values = months.map((month) => monthlyData[month][metric] || 0)
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const change = secondAvg - firstAvg
    trends[metric] = {
      direction: change > 0 ? "increasing" : change < 0 ? "decreasing" : "stable",
      change: Math.abs(change),
      percentage: firstAvg > 0 ? (change / firstAvg) * 100 : 0,
    }
  })

  return trends
}
