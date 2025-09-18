// Consultations Management API
import { NextResponse } from "next/server"
import { connectToDatabase, DatabaseOperations } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth.js"
import { ObjectId } from "mongodb"
import { createNotification } from "../../../lib/websocket/server.js"

const authService = new AuthService()

// GET /api/consultations - Get user's consultations
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    const upcoming = url.searchParams.get("upcoming") === "true"

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    let consultations = await dbOps.getUserConsultations(decoded.userId)

    // Filter by status if provided
    if (status) {
      consultations = consultations.filter((c) => c.status === status)
    }

    // Filter upcoming consultations
    if (upcoming) {
      const now = new Date()
      consultations = consultations.filter((c) => new Date(c.appointmentDate) > now)
    }

    // Populate doctor information
    const consultationsWithDoctors = await Promise.all(
      consultations.map(async (consultation) => {
        const doctor = await db
          .collection("doctors")
          .findOne(
            { _id: consultation.doctorId },
            { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.specialization": 1 } },
          )

        return {
          ...consultation,
          doctor: doctor
            ? {
                firstName: doctor.profile.firstName,
                lastName: doctor.profile.lastName,
                specialization: doctor.profile.specialization,
              }
            : null,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      consultations: consultationsWithDoctors,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/consultations - Book a new consultation
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()

    const { doctorId, appointmentDate, duration, type, symptoms, notes } = body

    if (!doctorId || !appointmentDate) {
      return NextResponse.json({ error: "Doctor ID and appointment date are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const consultations = db.collection("consultations")
    const doctors = db.collection("doctors")

    // Verify doctor exists and is available
    const doctor = await doctors.findOne({ _id: new ObjectId(doctorId) })
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    if (!doctor.isVerified) {
      return NextResponse.json({ error: "Doctor is not verified" }, { status: 400 })
    }

    // Check if the time slot is available
    const requestedTime = new Date(appointmentDate)
    const isAvailable = await checkTimeSlotAvailability(doctorId, requestedTime, consultations, doctor)

    if (!isAvailable) {
      return NextResponse.json({ error: "Time slot is not available" }, { status: 400 })
    }

    // Create consultation
    const consultationData = {
      userId: new ObjectId(decoded.userId),
      doctorId: new ObjectId(doctorId),
      appointmentDate: requestedTime,
      duration: duration || 60,
      status: "scheduled",
      type: type || "video",
      symptoms: symptoms || [],
      notes: notes || "",
      followUpRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await consultations.insertOne(consultationData)

    // Create notification for doctor
    await createNotification(db, {
      userId: new ObjectId(doctorId),
      type: "new_consultation",
      title: "New consultation booked",
      message: `A new consultation has been scheduled for ${requestedTime.toLocaleString()}`,
      data: { consultationId: result.insertedId },
    })

    // Generate meeting room/session ID for video calls
    const sessionId = `consultation_${result.insertedId}_${Date.now()}`

    return NextResponse.json({
      success: true,
      consultationId: result.insertedId,
      sessionId,
      message: "Consultation booked successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to check time slot availability
async function checkTimeSlotAvailability(doctorId, requestedTime, consultationsCollection, doctor) {
  // Check if doctor has availability for this day/time
  const dayName = requestedTime.toLocaleDateString("en-US", { weekday: "lowercase" })
  const timeString = requestedTime.toTimeString().slice(0, 5)

  const dayAvailability = doctor.availability.find((av) => av.day === dayName)
  if (!dayAvailability) return false

  const slotAvailable = dayAvailability.slots.some((slot) => {
    const slotStart = slot.startTime
    const slotEnd = slot.endTime
    return slot.isAvailable && timeString >= slotStart && timeString < slotEnd
  })

  if (!slotAvailable) return false

  // Check for existing consultations at this time
  const existingConsultation = await consultationsCollection.findOne({
    doctorId: new ObjectId(doctorId),
    appointmentDate: requestedTime,
    status: { $in: ["scheduled", "in_progress"] },
  })

  return !existingConsultation
}
