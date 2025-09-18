// Notification creation utility
import { connectToDatabase, DatabaseOperations } from "../database/mongodb.js"

export async function createNotification(userId, type, title, message, data = {}) {
  try {
    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)
    
    const notification = {
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    }
    
    const result = await dbOps.createNotification(notification)
    return { success: true, notification: { ...notification, _id: result.insertedId } }
  } catch (error) {
    console.error("Failed to create notification:", error)
    return { success: false, error: error.message }
  }
}

export async function createNotificationForUser(userId, notificationData) {
  return createNotification(
    userId,
    notificationData.type,
    notificationData.title,
    notificationData.message,
    notificationData.data
  )
}
