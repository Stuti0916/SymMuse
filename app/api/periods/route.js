// Period Tracking API Routes
import { NextResponse } from "next/server"
import { connectToDatabase, DatabaseOperations } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth.js"

const authService = new AuthService()

// GET /api/periods - Get user's period history
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit")) || 12

    const periods = await dbOps.getUserPeriods(decoded.userId, limit)

    // Calculate cycle insights
    const insights = calculateCycleInsights(periods)

    return NextResponse.json({
      success: true,
      periods,
      insights,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/periods - Log a new period
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()

    const { startDate, endDate, flow, symptoms, notes } = body

    if (!startDate) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    const periodData = {
      userId: decoded.userId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      flow: flow || "medium",
      symptoms: symptoms || [],
      notes: notes || "",
      predicted: false,
    }

    const result = await dbOps.logPeriod(periodData)

    return NextResponse.json({
      success: true,
      periodId: result.insertedId,
      message: "Period logged successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to calculate cycle insights
function calculateCycleInsights(periods) {
  if (periods.length < 2) {
    return {
      averageCycleLength: null,
      averagePeriodLength: null,
      nextPredictedPeriod: null,
      cycleRegularity: "insufficient_data",
    }
  }

  // Calculate average cycle length
  const cycleLengths = []
  for (let i = 0; i < periods.length - 1; i++) {
    const current = new Date(periods[i].startDate)
    const next = new Date(periods[i + 1].startDate)
    const diffDays = Math.abs((current - next) / (1000 * 60 * 60 * 24))
    cycleLengths.push(diffDays)
  }

  const averageCycleLength = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)

  // Calculate average period length
  const periodLengths = periods
    .filter((p) => p.endDate)
    .map((p) => {
      const start = new Date(p.startDate)
      const end = new Date(p.endDate)
      return Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1
    })

  const averagePeriodLength =
    periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null

  // Predict next period
  const lastPeriod = new Date(periods[0].startDate)
  const nextPredictedPeriod = new Date(lastPeriod.getTime() + averageCycleLength * 24 * 60 * 60 * 1000)

  // Determine cycle regularity
  const cycleVariation = Math.max(...cycleLengths) - Math.min(...cycleLengths)
  let cycleRegularity = "regular"
  if (cycleVariation > 7) cycleRegularity = "irregular"
  else if (cycleVariation > 4) cycleRegularity = "somewhat_irregular"

  return {
    averageCycleLength,
    averagePeriodLength,
    nextPredictedPeriod,
    cycleRegularity,
    totalCycles: cycleLengths.length,
  }
}
