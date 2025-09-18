// Doctor Availability Management API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../../lib/auth/auth.js"

const authService = new AuthService()

// GET /api/doctors/[id]/availability - Get doctor's availability
export async function GET(request, { params }) {
  try {
    const { id } = params
    const url = new URL(request.url)
    const date = url.searchParams.get("date") // YYYY-MM-DD format
    const days = Number.parseInt(url.searchParams.get("days")) || 7 // Number of days to fetch

    const { db } = await connectToDatabase()
    const doctors = db.collection("doctors")
    const consultations = db.collection("consultations")

    const doctor = await doctors.findOne({ _id: new ObjectId(id) })
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    const startDate = date ? new Date(date) : new Date()
    const availability = []

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)

      const dayName = currentDate.toLocaleDateString("en-US", { weekday: "lowercase" })
      const dayAvailability = doctor.availability.find((av) => av.day === dayName)

      if (dayAvailability) {
        // Get existing consultations for this day
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)

        const existingConsultations = await consultations
          .find({
            doctorId: new ObjectId(id),
            appointmentDate: {
              $gte: startOfDay,
              $lt: endOfDay,
            },
            status: { $in: ["scheduled", "in_progress"] },
          })
          .toArray()

        // Mark slots as booked if they have consultations
        const slotsWithBookings = dayAvailability.slots.map((slot) => {
          const slotDateTime = new Date(`${currentDate.toDateString()} ${slot.startTime}`)
          const isBooked = existingConsultations.some((consultation) => {
            const consultationTime = new Date(consultation.appointmentDate)
            return Math.abs(consultationTime - slotDateTime) < 60000
          })

          const isPast = slotDateTime < new Date()

          return {
            ...slot,
            isBooked,
            isPast,
            isAvailable: slot.isAvailable && !isBooked && !isPast,
          }
        })

        availability.push({
          date: currentDate.toISOString().split("T")[0],
          dayName,
          slots: slotsWithBookings,
        })
      } else {
        availability.push({
          date: currentDate.toISOString().split("T")[0],
          dayName,
          slots: [],
        })
      }
    }

    return NextResponse.json({
      success: true,
      doctorId: id,
      availability,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/doctors/[id]/availability - Update doctor's availability (doctor only)
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
    const doctors = db.collection("doctors")

    // Verify doctor owns this profile
    const doctor = await doctors.findOne({ _id: new ObjectId(id) })
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    if (doctor._id.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized to update this availability" }, { status: 403 })
    }

    const { availability } = body

    const result = await doctors.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          availability,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      success: true,
      message: "Availability updated successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
