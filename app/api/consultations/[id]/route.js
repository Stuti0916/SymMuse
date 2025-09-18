// Individual Consultation Management API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../lib/auth/auth.js"
import { createNotification } from "../../../../lib/websocket/server.js"

const authService = new AuthService()

// GET /api/consultations/[id] - Get consultation details
export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params

    const { db } = await connectToDatabase()
    const consultations = db.collection("consultations")

    const consultation = await consultations.findOne({ _id: new ObjectId(id) })
    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    // Check if user has access to this consultation
    if (consultation.userId.toString() !== decoded.userId && consultation.doctorId.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Populate user and doctor information
    const user = await db
      .collection("users")
      .findOne(
        { _id: consultation.userId },
        { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.dateOfBirth": 1 } },
      )

    const doctor = await db.collection("doctors").findOne(
      { _id: consultation.doctorId },
      {
        projection: {
          "profile.firstName": 1,
          "profile.lastName": 1,
          "profile.specialization": 1,
          "profile.qualifications": 1,
        },
      },
    )

    const consultationWithDetails = {
      ...consultation,
      user: user
        ? {
            firstName: user.profile?.firstName || "",
            lastName: user.profile?.lastName || "",
            dateOfBirth: user.profile?.dateOfBirth || null,
          }
        : null,
      doctor: doctor
        ? {
            firstName: doctor.profile?.firstName || "",
            lastName: doctor.profile?.lastName || "",
            specialization: doctor.profile?.specialization || "",
            qualifications: doctor.profile?.qualifications || [],
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      consultation: consultationWithDetails,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/consultations/[id] - Update consultation (reschedule, cancel, complete)
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params
    const body = await request.json()

    const { db } = await connectToDatabase()
    const consultations = db.collection("consultations")

    const consultation = await consultations.findOne({ _id: new ObjectId(id) })
    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    // Check authorization
    const isPatient = consultation.userId.toString() === decoded.userId
    const isDoctor = consultation.doctorId.toString() === decoded.userId

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    const { action, ...updateData } = body

    let result
    let notificationData

    switch (action) {
      case "reschedule":
        if (!updateData.appointmentDate) {
          return NextResponse.json({ error: "New appointment date required" }, { status: 400 })
        }

        // Check if new time slot is available
        const newTime = new Date(updateData.appointmentDate)
        const doctor = await db.collection("doctors").findOne({ _id: consultation.doctorId })
        const isAvailable = await checkTimeSlotAvailability(consultation.doctorId, newTime, consultations, doctor)

        if (!isAvailable) {
          return NextResponse.json({ error: "New time slot is not available" }, { status: 400 })
        }

        result = await consultations.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              appointmentDate: newTime,
              status: "scheduled",
              updatedAt: new Date(),
            },
          },
        )

        notificationData = {
          userId: isPatient ? consultation.doctorId : consultation.userId,
          type: "consultation_rescheduled",
          title: "Consultation rescheduled",
          message: `Your consultation has been rescheduled to ${newTime.toLocaleString()}`,
          data: { consultationId: id },
        }
        break

      case "cancel":
        result = await consultations.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "cancelled",
              updatedAt: new Date(),
            },
          },
        )

        notificationData = {
          userId: isPatient ? consultation.doctorId : consultation.userId,
          type: "consultation_cancelled",
          title: "Consultation cancelled",
          message: "A consultation has been cancelled",
          data: { consultationId: id },
        }
        break

      case "complete":
        if (!isDoctor) {
          return NextResponse.json({ error: "Only doctors can mark consultations as complete" }, { status: 403 })
        }

        result = await consultations.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "completed",
              prescription: updateData.prescription || "",
              followUpRequired: updateData.followUpRequired || false,
              updatedAt: new Date(),
            },
          },
        )

        // Update doctor's consultation count
        await db.collection("doctors").updateOne({ _id: consultation.doctorId }, { $inc: { totalConsultations: 1 } })

        notificationData = {
          userId: consultation.userId,
          type: "consultation_completed",
          title: "Consultation completed",
          message: "Your consultation has been completed. Please rate your experience.",
          data: { consultationId: id },
        }
        break

      case "start":
        if (!isDoctor) {
          return NextResponse.json({ error: "Only doctors can start consultations" }, { status: 403 })
        }

        result = await consultations.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              status: "in_progress",
              updatedAt: new Date(),
            },
          },
        )

        notificationData = {
          userId: consultation.userId,
          type: "consultation_started",
          title: "Consultation started",
          message: "Your doctor is ready to begin the consultation",
          data: { consultationId: id },
        }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Send notification
    if (notificationData) {
      await createNotification(db, notificationData)
    }

    return NextResponse.json({
      success: true,
      message: `Consultation ${action}d successfully`,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function (reused from consultations/route.js)
async function checkTimeSlotAvailability(doctorId, requestedTime, consultationsCollection, doctor) {
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

  const existingConsultation = await consultationsCollection.findOne({
    doctorId: new ObjectId(doctorId),
    appointmentDate: requestedTime,
    status: { $in: ["scheduled", "in_progress"] },
  })

  return !existingConsultation
}
