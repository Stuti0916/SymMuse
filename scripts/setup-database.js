// Database Setup Script - Run this to create indexes and initial data
import { connectToDatabase } from "../lib/database/mongodb.js"

async function setupDatabase() {
  try {
    const { db } = await connectToDatabase()

    console.log("Setting up database indexes...")

    // Create indexes for better performance
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("periods").createIndex({ userId: 1, startDate: -1 })
    await db.collection("mood_tracking").createIndex({ userId: 1, date: -1 })
    await db.collection("community_posts").createIndex({ createdAt: -1 })
    await db.collection("community_posts").createIndex({ category: 1, createdAt: -1 })
    await db.collection("consultations").createIndex({ userId: 1, appointmentDate: -1 })
    await db.collection("consultations").createIndex({ doctorId: 1, appointmentDate: -1 })
    await db.collection("notifications").createIndex({ userId: 1, createdAt: -1 })

    console.log("Database indexes created successfully!")

    // Insert sample categories for community posts
    const categories = [
      "General Discussion",
      "Period Talk",
      "Mood & Mental Health",
      "Symptoms & Health",
      "Lifestyle & Wellness",
      "Questions & Support",
    ]

    console.log("Database setup completed successfully!")
    console.log("Available community categories:", categories)
  } catch (error) {
    console.error("Database setup failed:", error)
  }
}

// Run the setup
setupDatabase()