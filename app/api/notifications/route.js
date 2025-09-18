// Notifications API
import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/database/mongodb.js"
import { AuthService } from "../../../lib/auth/auth"
import { ObjectId } from "mongodb"

const authService = new AuthService()

// GET /api/notifications - Get user notifications
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit")) || 20
    const unreadOnly = url.searchParams.get("unread") === "true"

    const { db } = await connectToDatabase()
    const notifications = db.collection("notifications")

    const query = { userId: decoded.userId }
    if (unreadOnly) {
      query.isRead = false
    }

    const userNotifications = await notifications.find(query).sort({ createdAt: -1 }).limit(limit).toArray()

    const unreadCount = await notifications.countDocuments({
      userId: decoded.userId,
      isRead: false,
    })

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      unreadCount,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()
    const { notificationIds, markAllAsRead } = body

    const { db } = await connectToDatabase()
    const notifications = db.collection("notifications")

    let result
    if (markAllAsRead) {
      result = await notifications.updateMany({ userId: decoded.userId, isRead: false }, { $set: { isRead: true } })
    } else if (notificationIds && notificationIds.length > 0) {
      result = await notifications.updateMany(
        {
          _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
          userId: decoded.userId,
        },
        { $set: { isRead: true } },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
