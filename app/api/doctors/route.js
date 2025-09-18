// Doctors Management API
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth"

const authService = new AuthService()

// GET /api/doctors - Get available doctors with filters
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const specialization = url.searchParams.get("specialization")
    const availability = url.searchParams.get("availability") // today, tomorrow, week
    const rating = url.searchParams.get("minRating")
    const limit = Number.parseInt(url.searchParams.get("limit")) || 20

    const { db } = await connectToDatabase()
    const doctors = db.collection("doctors")

    // Build query
    const query = { isVerified: true }
    if (specialization) {
      query["profile.specialization"] = { $regex: specialization, $options: "i" }
    }
    if (rating) {
      query.rating = { $gte: Number.parseFloat(rating) }
    }

    let doctorsList = await doctors.find(query).limit(limit).toArray()

    // Filter by availability if requested
    if (availability) {
      doctorsList = await filterDoctorsByAvailability(doctorsList, availability)
    }

    // Remove sensitive information
    const publicDoctors = doctorsList.map((doctor) => ({
      _id: doctor._id,
      profile: doctor.profile,
      rating: doctor.rating,
      totalConsultations: doctor.totalConsultations,
      isVerified: doctor.isVerified,
      nextAvailableSlot: doctor.nextAvailableSlot,
    }))

    return NextResponse.json({
      success: true,
      doctors: publicDoctors,
      total: publicDoctors.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/doctors - Register as a doctor (separate registration flow)
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, profile, qualifications, specialization } = body

    if (!email || !password || !profile || !specialization) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const doctors = db.collection("doctors")

    // Check if doctor already exists
    const existingDoctor = await doctors.findOne({ email })
    if (existingDoctor) {
      return NextResponse.json({ error: "Doctor already registered with this email" }, { status: 400 })
    }

    // Hash password
    const bcrypt = await import("bcryptjs")
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create default availability (9 AM - 5 PM, Monday to Friday)
    const defaultAvailability = ["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => ({
      day,
      slots: generateTimeSlots("09:00", "17:00", 60), // 1-hour slots
    }))

    const doctorData = {
      email,
      password: hashedPassword,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        specialization,
        experience: profile.experience || 0,
        qualifications: qualifications || [],
        profilePicture: profile.profilePicture || "",
        bio: profile.bio || "",
        languages: profile.languages || ["English"],
      },
      availability: defaultAvailability,
      rating: 0,
      totalConsultations: 0,
      isVerified: false, // Requires admin approval
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await doctors.insertOne(doctorData)

    return NextResponse.json({
      success: true,
      doctorId: result.insertedId,
      message: "Doctor registration submitted for verification",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, durationMinutes) {
  const slots = []
  const start = new Date(`2000-01-01 ${startTime}`)
  const end = new Date(`2000-01-01 ${endTime}`)

  let current = new Date(start)
  while (current < end) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000)
    slots.push({
      startTime: current.toTimeString().slice(0, 5),
      endTime: slotEnd.toTimeString().slice(0, 5),
      isAvailable: true,
    })
    current = slotEnd
  }

  return slots
}

// Helper function to filter doctors by availability
async function filterDoctorsByAvailability(doctors, availabilityFilter) {
  const { db } = await connectToDatabase()
  const consultations = db.collection("consultations")

  const now = new Date()
  let filterDate

  switch (availabilityFilter) {
    case "today":
      filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "tomorrow":
      filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      break
    case "week":
      filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      break
    default:
      return doctors
  }

  const availableDoctors = []

  for (const doctor of doctors) {
    const hasAvailability = await checkDoctorAvailability(doctor, filterDate, consultations)
    if (hasAvailability.available) {
      availableDoctors.push({
        ...doctor,
        nextAvailableSlot: hasAvailability.nextSlot,
      })
    }
  }

  return availableDoctors
}

async function checkDoctorAvailability(doctor, date, consultationsCollection) {
  const dayName = date.toLocaleDateString("en-US", { weekday: "lowercase" })
  const dayAvailability = doctor.availability.find((av) => av.day === dayName)

  if (!dayAvailability) {
    return { available: false }
  }

  // Get existing consultations for this doctor on this date
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

  const existingConsultations = await consultationsCollection
    .find({
      doctorId: doctor._id,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      status: { $in: ["scheduled", "in_progress"] },
    })
    .toArray()

  // Check for available slots
  for (const slot of dayAvailability.slots) {
    if (!slot.isAvailable) continue

    const slotDateTime = new Date(`${date.toDateString()} ${slot.startTime}`)
    const isSlotBooked = existingConsultations.some((consultation) => {
      const consultationTime = new Date(consultation.appointmentDate)
      return Math.abs(consultationTime - slotDateTime) < 60000 // Within 1 minute
    })

    if (!isSlotBooked && slotDateTime > new Date()) {
      return {
        available: true,
        nextSlot: {
          date: date.toISOString().split("T")[0],
          time: slot.startTime,
          duration: 60,
        },
      }
    }
  }

  return { available: false }
}
