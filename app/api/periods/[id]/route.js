// Individual Period Management API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../lib/auth/auth"

const authService = new AuthService()

// PUT /api/periods/[id] - Update a period entry
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
    const periods = db.collection("periods")

    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    if (body.startDate) updateData.startDate = new Date(body.startDate)
    if (body.endDate) updateData.endDate = new Date(body.endDate)

    const result = await periods.updateOne({ _id: new ObjectId(id), userId: decoded.userId }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Period updated successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/periods/[id] - Delete a period entry
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params

    const { db } = await connectToDatabase()
    const periods = db.collection("periods")

    const result = await periods.deleteOne({ _id: new ObjectId(id), userId: decoded.userId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Period deleted successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
