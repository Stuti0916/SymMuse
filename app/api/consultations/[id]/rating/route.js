// Consultation Rating and Feedback API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../../lib/auth/auth"

const authService = new AuthService()

// POST /api/consultations/[id]/rating - Rate and provide feedback for consultation
export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params
    const body = await request.json()

    const { rating, feedback } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const consultations = db.collection("consultations")

    const consultation = await consultations.findOne({ _id: new ObjectId(id) })
    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    // Only patients can rate consultations
    if (consultation.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Only patients can rate consultations" }, { status: 403 })
    }

    // Consultation must be completed to be rated
    if (consultation.status !== "completed") {
      return NextResponse.json({ error: "Can only rate completed consultations" }, { status: 400 })
    }

    // Check if already rated
    if (consultation.rating) {
      return NextResponse.json({ error: "Consultation already rated" }, { status: 400 })
    }

    // Update consultation with rating
    const result = await consultations.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          rating,
          feedback: feedback || "",
          updatedAt: new Date(),
        },
      },
    )

    // Update doctor's overall rating
    await updateDoctorRating(db, consultation.doctorId)

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to update doctor's overall rating
async function updateDoctorRating(db, doctorId) {
  const consultations = db.collection("consultations")
  const doctors = db.collection("doctors")

  // Get all rated consultations for this doctor
  const ratedConsultations = await consultations
    .find({
      doctorId: new ObjectId(doctorId),
      rating: { $exists: true, $ne: null },
    })
    .toArray()

  if (ratedConsultations.length === 0) return

  // Calculate average rating
  const totalRating = ratedConsultations.reduce((sum, consultation) => sum + consultation.rating, 0)
  const averageRating = totalRating / ratedConsultations.length

  // Update doctor's rating
  await doctors.updateOne(
    { _id: new ObjectId(doctorId) },
    {
      $set: {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updatedAt: new Date(),
      },
    },
  )
}
