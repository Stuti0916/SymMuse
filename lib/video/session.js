// Video Call Session Management
export class VideoSessionManager {
  constructor() {
    this.activeSessions = new Map() // consultationId -> session data
  }

  // Create a new video session for consultation
  createSession(consultationId, doctorId, patientId) {
    const sessionId = `consultation_${consultationId}_${Date.now()}`
    const sessionData = {
      sessionId,
      consultationId,
      doctorId,
      patientId,
      status: "waiting",
      createdAt: new Date(),
      participants: new Set(),
      recordingEnabled: false,
    }

    this.activeSessions.set(consultationId, sessionData)

    return {
      sessionId,
      joinUrl: `/consultation/${consultationId}/join`,
      sessionToken: this.generateSessionToken(sessionId, consultationId),
    }
  }

  // Join a video session
  joinSession(consultationId, userId, userType) {
    const session = this.activeSessions.get(consultationId)
    if (!session) {
      throw new Error("Session not found")
    }

    // Verify user has access to this session
    if (userType === "doctor" && session.doctorId !== userId) {
      throw new Error("Unauthorized access")
    }
    if (userType === "patient" && session.patientId !== userId) {
      throw new Error("Unauthorized access")
    }

    session.participants.add(userId)

    // Start session when both participants join
    if (session.participants.size === 2) {
      session.status = "active"
      session.startedAt = new Date()
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      participants: Array.from(session.participants),
    }
  }

  // End video session
  endSession(consultationId, userId) {
    const session = this.activeSessions.get(consultationId)
    if (!session) {
      throw new Error("Session not found")
    }

    session.status = "ended"
    session.endedAt = new Date()
    session.duration = session.startedAt ? Math.floor((session.endedAt - session.startedAt) / 1000 / 60) : 0

    // Clean up session after 1 hour
    setTimeout(
      () => {
        this.activeSessions.delete(consultationId)
      },
      60 * 60 * 1000,
    )

    return {
      sessionId: session.sessionId,
      duration: session.duration,
      status: "ended",
    }
  }

  // Generate session token for security
  generateSessionToken(sessionId, consultationId) {
    const jwt = require("jsonwebtoken")
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

    return jwt.sign(
      {
        sessionId,
        consultationId,
        type: "video_session",
      },
      JWT_SECRET,
      { expiresIn: "2h" },
    )
  }

  // Get session status
  getSessionStatus(consultationId) {
    const session = this.activeSessions.get(consultationId)
    if (!session) {
      return { status: "not_found" }
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      participants: Array.from(session.participants),
      duration: session.startedAt ? Math.floor((new Date() - session.startedAt) / 1000 / 60) : 0,
    }
  }
}

// Global session manager instance
export const videoSessionManager = new VideoSessionManager()
