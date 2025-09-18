// MongoDB Connection and Database Operations
import { MongoClient } from "mongodb"

let client
let db

export async function connectToDatabase() {
  if (db) {
    return { db, client }
  }

  try {
    // Replace with your MongoDB connection string
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/symmuse"

    client = new MongoClient(uri)

    await client.connect()
    db = client.db("symmuse")

    console.log("Connected to MongoDB")
    return { db, client }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw error
  }
}

// Database Operations Helper Functions
export class DatabaseOperations {
  constructor(db) {
    this.db = db
  }

  // User Operations
  async createUser(userData) {
    const users = this.db.collection("users")
    return await users.insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  async findUserByEmail(email) {
    const users = this.db.collection("users")
    return await users.findOne({ email })
  }

  async updateUser(userId, updateData) {
    const users = this.db.collection("users")
    return await users.updateOne({ _id: userId }, { $set: { ...updateData, updatedAt: new Date() } })
  }

  // Period Tracking Operations
  async logPeriod(periodData) {
    const periods = this.db.collection("periods")
    return await periods.insertOne({
      ...periodData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  async getUserPeriods(userId, limit = 12) {
    const periods = this.db.collection("periods")
    return await periods.find({ userId }).sort({ startDate: -1 }).limit(limit).toArray()
  }

  // Mood Tracking Operations
  async logMood(moodData) {
    const moods = this.db.collection("mood_tracking")
    return await moods.insertOne({
      ...moodData,
      createdAt: new Date(),
    })
  }

  async getUserMoods(userId, startDate, endDate) {
    const moods = this.db.collection("mood_tracking")
    return await moods
      .find({
        userId,
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: -1 })
      .toArray()
  }

  // Community Operations
  async createPost(postData) {
    const posts = this.db.collection("community_posts")
    return await posts.insertOne({
      ...postData,
      likes: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  async getCommunityPosts(category = null, limit = 20, skip = 0) {
    const posts = this.db.collection("community_posts")
    const query = category ? { category } : {}

    return await posts.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
  }

  // Consultation Operations
  async bookConsultation(consultationData) {
    const consultations = this.db.collection("consultations")
    return await consultations.insertOne({
      ...consultationData,
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  async getUserConsultations(userId) {
    const consultations = this.db.collection("consultations")
    return await consultations.find({ userId }).sort({ appointmentDate: -1 }).toArray()
  }

  // Notification Operations
  async createNotification(notificationData) {
    const notifications = this.db.collection("notifications")
    return await notifications.insertOne({
      ...notificationData,
      isRead: false,
      createdAt: new Date(),
    })
  }

  async getUserNotifications(userId, limit = 50) {
    const notifications = this.db.collection("notifications")
    return await notifications
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
  }

  async getUnreadNotificationCount(userId) {
    const notifications = this.db.collection("notifications")
    return await notifications.countDocuments({ userId, isRead: false })
  }

  async markNotificationAsRead(notificationId) {
    const notifications = this.db.collection("notifications")
    return await notifications.updateOne(
      { _id: notificationId },
      { $set: { isRead: true } }
    )
  }
}
