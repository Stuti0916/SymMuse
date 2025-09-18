// Mood Tracking API Routes
import { NextResponse } from "next/server"
import { connectToDatabase, DatabaseOperations } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth"

const authService = new AuthService()

// GET /api/mood - Get user's mood tracking data
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const url = new URL(request.url)

    // Get date range parameters
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")

    // Default to last 30 days if no range specified
    const defaultEndDate = new Date()
    const defaultStartDate = new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    const moods = await dbOps.getUserMoods(
      decoded.userId,
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate,
    )

    // Calculate mood analytics
    const analytics = calculateMoodAnalytics(moods)

    return NextResponse.json({
      success: true,
      moods,
      analytics,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/mood - Log daily mood and symptoms
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()

    const { date, mood, symptoms, energy, sleep, notes } = body

    if (!date || !mood) {
      return NextResponse.json({ error: "Date and mood are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    // Check if mood entry already exists for this date
    const existingMood = await db.collection("mood_tracking").findOne({
      userId: decoded.userId,
      date: new Date(date),
    })

    const moodData = {
      userId: decoded.userId,
      date: new Date(date),
      mood: {
        level: mood.level || 5,
        emotions: mood.emotions || [],
      },
      symptoms: {
        physical: symptoms?.physical || [],
        emotional: symptoms?.emotional || [],
      },
      energy: energy || 5,
      sleep: {
        hours: sleep?.hours || 8,
        quality: sleep?.quality || 5,
      },
      notes: notes || "",
    }

    let result
    if (existingMood) {
      // Update existing entry
      result = await db.collection("mood_tracking").updateOne({ _id: existingMood._id }, { $set: moodData })
      return NextResponse.json({
        success: true,
        message: "Mood updated successfully",
      })
    } else {
      // Create new entry
      result = await dbOps.logMood(moodData)
      return NextResponse.json({
        success: true,
        moodId: result.insertedId,
        message: "Mood logged successfully",
      })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to calculate mood analytics
function calculateMoodAnalytics(moods) {
  if (moods.length === 0) {
    return {
      averageMood: null,
      averageEnergy: null,
      averageSleep: null,
      commonSymptoms: [],
      moodTrends: [],
    }
  }

  // Calculate averages
  const averageMood = moods.reduce((sum, m) => sum + m.mood.level, 0) / moods.length
  const averageEnergy = moods.reduce((sum, m) => sum + m.energy, 0) / moods.length
  const averageSleep = moods.reduce((sum, m) => sum + m.sleep.hours, 0) / moods.length

  // Find common symptoms
  const symptomCounts = {}
  moods.forEach((mood) => {
    ;[...mood.symptoms.physical, ...mood.symptoms.emotional].forEach((symptom) => {
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
    })
  })

  const commonSymptoms = Object.entries(symptomCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([symptom, count]) => ({ symptom, count, percentage: (count / moods.length) * 100 }))

  // Calculate mood trends (last 7 days vs previous 7 days)
  const sortedMoods = moods.sort((a, b) => new Date(b.date) - new Date(a.date))
  const recent7 = sortedMoods.slice(0, 7)
  const previous7 = sortedMoods.slice(7, 14)

  let moodTrend = "stable"
  if (recent7.length >= 3 && previous7.length >= 3) {
    const recentAvg = recent7.reduce((sum, m) => sum + m.mood.level, 0) / recent7.length
    const previousAvg = previous7.reduce((sum, m) => sum + m.mood.level, 0) / previous7.length
    const difference = recentAvg - previousAvg

    if (difference > 0.5) moodTrend = "improving"
    else if (difference < -0.5) moodTrend = "declining"
  }

  return {
    averageMood: Math.round(averageMood * 10) / 10,
    averageEnergy: Math.round(averageEnergy * 10) / 10,
    averageSleep: Math.round(averageSleep * 10) / 10,
    commonSymptoms,
    moodTrend,
    totalEntries: moods.length,
  }
}
