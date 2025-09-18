// Authentication System
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { connectToDatabase, DatabaseOperations } from "../database/mongodb.js"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export class AuthService {
  constructor() {
    this.dbOps = null
    this.initPromise = this.initDatabase()
  }

  async initDatabase() {
    try {
      const { db } = await connectToDatabase()
      this.dbOps = new DatabaseOperations(db)
      return this.dbOps
    } catch (error) {
      console.error("Failed to initialize database:", error)
      throw error
    }
  }

  async ensureDatabase() {
    if (!this.dbOps) {
      await this.initPromise
    }
    return this.dbOps
  }

  async register(userData) {
    try {
      const dbOps = await this.ensureDatabase()
      
      // Check if user already exists
      const existingUser = await dbOps.findUserByEmail(userData.email)
      if (existingUser) {
        throw new Error("User already exists with this email")
      }

      // Hash password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds)

      // Create user with default preferences
      const newUser = {
        email: userData.email,
        password: hashedPassword,
        profile: {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          dateOfBirth: userData.dateOfBirth || null,
          profilePicture: "",
          bio: "",
          location: "",
        },
        preferences: {
          cycleLength: 28,
          periodLength: 5,
          notifications: {
            periodReminder: true,
            ovulationReminder: true,
            moodTracking: true,
          },
          privacy: {
            profileVisibility: "public",
            shareData: false,
          },
        },
        subscription: {
          plan: "free",
          startDate: new Date(),
          endDate: null,
          stripeCustomerId: null,
        },
      }

      const result = await dbOps.createUser(newUser)

      // Generate JWT token
      const token = this.generateToken(result.insertedId)

      return {
        success: true,
        user: { ...newUser, _id: result.insertedId },
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async login(email, password) {
    try {
      const dbOps = await this.ensureDatabase()
      
      // Find user by email
      const user = await dbOps.findUserByEmail(email)
      if (!user) {
        throw new Error("Invalid email or password")
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        throw new Error("Invalid email or password")
      }

      // Generate JWT token
      const token = this.generateToken(user._id)

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user

      return {
        success: true,
        user: userWithoutPassword,
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  generateToken(userId) {
    return jwt.sign({ userId: userId.toString() }, JWT_SECRET, { expiresIn: "7d" })
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      return decoded
    } catch (error) {
      throw new Error("Invalid or expired token")
    }
  }

  // Middleware for protecting routes
  async authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: "Access token required" })
    }

    try {
      const decoded = this.verifyToken(token)
      req.userId = decoded.userId
      next()
    } catch (error) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
  }
}
