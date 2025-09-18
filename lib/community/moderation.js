// Community Moderation System
import { connectToDatabase } from "../database/mongodb.js"

export class ModerationService {
  constructor() {
    this.bannedWords = [
      // Add inappropriate words here
      "spam",
      "scam",
    ]
    this.suspiciousPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /[A-Z]{10,}/, // All caps
      /https?:\/\/[^\s]+/gi, // URLs (might be spam)
    ]
  }

  async moderateContent(content, userId) {
    const issues = []

    // Check for banned words
    const lowerContent = content.toLowerCase()
    for (const word of this.bannedWords) {
      if (lowerContent.includes(word)) {
        issues.push({
          type: "banned_word",
          word,
          severity: "high",
        })
      }
    }

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: "suspicious_pattern",
          pattern: pattern.toString(),
          severity: "medium",
        })
      }
    }

    // Check user history for spam behavior
    const userHistory = await this.getUserModerationHistory(userId)
    if (userHistory.recentViolations > 3) {
      issues.push({
        type: "repeat_offender",
        severity: "high",
      })
    }

    return {
      approved: issues.length === 0 || !issues.some((issue) => issue.severity === "high"),
      issues,
      requiresReview: issues.some((issue) => issue.severity === "medium"),
    }
  }

  async getUserModerationHistory(userId) {
    const { db } = await connectToDatabase()
    const moderationLogs = db.collection("moderation_logs")

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentViolations = await moderationLogs.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      action: { $in: ["content_removed", "user_warned"] },
    })

    return {
      recentViolations,
    }
  }

  async logModerationAction(userId, action, reason, contentId = null) {
    const { db } = await connectToDatabase()
    const moderationLogs = db.collection("moderation_logs")

    return await moderationLogs.insertOne({
      userId,
      action,
      reason,
      contentId,
      createdAt: new Date(),
    })
  }

  async reportContent(reporterId, contentId, contentType, reason) {
    const { db } = await connectToDatabase()
    const reports = db.collection("content_reports")

    return await reports.insertOne({
      reporterId,
      contentId,
      contentType, // 'post' or 'comment'
      reason,
      status: "pending",
      createdAt: new Date(),
    })
  }
}
