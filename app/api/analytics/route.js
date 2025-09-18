// Analytics API for comprehensive health insights
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth"

const authService = new AuthService()

// GET /api/analytics - Get comprehensive health analytics
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { db } = await connectToDatabase()

    // Get last 6 months of data
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Fetch periods and moods
    const periods = await db
      .collection("periods")
      .find({
        userId: decoded.userId,
        startDate: { $gte: sixMonthsAgo },
      })
      .sort({ startDate: -1 })
      .toArray()

    const moods = await db
      .collection("mood_tracking")
      .find({
        userId: decoded.userId,
        date: { $gte: sixMonthsAgo },
      })
      .sort({ date: -1 })
      .toArray()

    // Generate comprehensive analytics
    const analytics = {
      cycleHealth: analyzeCycleHealth(periods),
      moodPatterns: analyzeMoodPatterns(moods, periods),
      symptomCorrelations: analyzeSymptomCorrelations(moods, periods),
      healthScore: calculateHealthScore(periods, moods),
      recommendations: generateRecommendations(periods, moods),
    }

    return NextResponse.json({
      success: true,
      analytics,
      dataRange: {
        startDate: sixMonthsAgo,
        endDate: new Date(),
        periodsCount: periods.length,
        moodEntriesCount: moods.length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper functions for analytics
function analyzeCycleHealth(periods) {
  if (periods.length < 3) {
    return { status: "insufficient_data", message: "Need at least 3 cycles for analysis" }
  }

  const cycleLengths = []
  for (let i = 0; i < periods.length - 1; i++) {
    const current = new Date(periods[i].startDate)
    const next = new Date(periods[i + 1].startDate)
    const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
    cycleLengths.push(diffDays)
  }

  const avgLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths)

  let status = "healthy"
  let message = "Your cycles are regular and within normal range"

  if (avgLength < 21 || avgLength > 35) {
    status = "attention_needed"
    message = "Your average cycle length is outside the typical range (21-35 days)"
  } else if (variation > 7) {
    status = "irregular"
    message = "Your cycles show significant variation. Consider tracking more consistently"
  }

  return {
    status,
    message,
    averageLength: Math.round(avgLength),
    variation,
    totalCycles: cycleLengths.length,
  }
}

function analyzeMoodPatterns(moods, periods) {
  if (moods.length < 10) {
    return { status: "insufficient_data" }
  }

  // Analyze mood patterns relative to cycle phases
  const moodByPhase = {
    menstrual: [],
    follicular: [],
    ovulation: [],
    luteal: [],
  }

  moods.forEach((mood) => {
    const phase = determineCyclePhase(new Date(mood.date), periods)
    if (phase && moodByPhase[phase]) {
      moodByPhase[phase].push(mood.mood.level)
    }
  })

  const phaseAverages = {}
  Object.keys(moodByPhase).forEach((phase) => {
    if (moodByPhase[phase].length > 0) {
      phaseAverages[phase] = moodByPhase[phase].reduce((a, b) => a + b, 0) / moodByPhase[phase].length
    }
  })

  return {
    status: "analyzed",
    phaseAverages,
    insights: generateMoodInsights(phaseAverages),
  }
}

function analyzeSymptomCorrelations(moods, periods) {
  // Analyze which symptoms correlate with cycle phases
  const symptomsByPhase = {}

  moods.forEach((mood) => {
    const phase = determineCyclePhase(new Date(mood.date), periods)
    if (phase) {
      if (!symptomsByPhase[phase]) symptomsByPhase[phase] = {}

      const allSymptoms = [...mood.symptoms.physical, ...mood.symptoms.emotional]
      allSymptoms.forEach((symptom) => {
        symptomsByPhase[phase][symptom] = (symptomsByPhase[phase][symptom] || 0) + 1
      })
    }
  })

  return symptomsByPhase
}

function calculateHealthScore(periods, moods) {
  let score = 100
  const factors = []

  // Cycle regularity factor
  if (periods.length >= 3) {
    const cycleLengths = []
    for (let i = 0; i < periods.length - 1; i++) {
      const current = new Date(periods[i].startDate)
      const next = new Date(periods[i + 1].startDate)
      const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
      cycleLengths.push(diffDays)
    }

    const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths)
    if (variation > 7) {
      score -= 15
      factors.push("Irregular cycles detected")
    }
  }

  // Mood stability factor
  if (moods.length >= 7) {
    const recentMoods = moods.slice(0, 7).map((m) => m.mood.level)
    const moodVariation = Math.max(...recentMoods) - Math.min(...recentMoods)
    if (moodVariation > 5) {
      score -= 10
      factors.push("High mood variability")
    }
  }

  // Sleep quality factor
  if (moods.length >= 7) {
    const avgSleepQuality = moods.slice(0, 7).reduce((sum, m) => sum + m.sleep.quality, 0) / 7
    if (avgSleepQuality < 6) {
      score -= 10
      factors.push("Poor sleep quality")
    }
  }

  return {
    score: Math.max(score, 0),
    factors,
    level: score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "needs_attention",
  }
}

function generateRecommendations(periods, moods) {
  const recommendations = []

  // Cycle-based recommendations
  if (periods.length >= 3) {
    const cycleLengths = []
    for (let i = 0; i < periods.length - 1; i++) {
      const current = new Date(periods[i].startDate)
      const next = new Date(periods[i + 1].startDate)
      const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
      cycleLengths.push(diffDays)
    }

    const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths)
    if (variation > 7) {
      recommendations.push({
        type: "cycle_health",
        priority: "high",
        title: "Improve Cycle Regularity",
        description: "Consider stress management techniques and maintaining consistent sleep patterns",
      })
    }
  }

  // Mood-based recommendations
  if (moods.length >= 7) {
    const avgMood = moods.slice(0, 7).reduce((sum, m) => sum + m.mood.level, 0) / 7
    if (avgMood < 6) {
      recommendations.push({
        type: "mental_health",
        priority: "medium",
        title: "Focus on Mood Support",
        description: "Consider mindfulness practices, regular exercise, or speaking with a healthcare provider",
      })
    }
  }

  return recommendations
}

function determineCyclePhase(date, periods) {
  // Find the most recent period before this date
  const relevantPeriod = periods.find((p) => new Date(p.startDate) <= date)
  if (!relevantPeriod) return null

  const daysSincePeriod = Math.floor((date - new Date(relevantPeriod.startDate)) / (1000 * 60 * 60 * 24))

  if (daysSincePeriod <= 5) return "menstrual"
  if (daysSincePeriod <= 13) return "follicular"
  if (daysSincePeriod <= 16) return "ovulation"
  if (daysSincePeriod <= 28) return "luteal"

  return null
}

function generateMoodInsights(phaseAverages) {
  const insights = []

  if (phaseAverages.luteal && phaseAverages.follicular) {
    if (phaseAverages.luteal < phaseAverages.follicular - 1) {
      insights.push("You tend to experience lower mood during your luteal phase (PMS)")
    }
  }

  if (phaseAverages.menstrual && phaseAverages.menstrual < 6) {
    insights.push("Your mood tends to be lower during menstruation")
  }

  return insights
}
