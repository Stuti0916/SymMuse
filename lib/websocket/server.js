// WebSocket Server for Real-time Features
import { WebSocketServer } from "ws"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

class CommunityWebSocketServer {
  constructor() {
    this.clients = new Map() // userId -> WebSocket connection
    this.rooms = new Map() // roomId -> Set of userIds
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server })

    this.wss.on("connection", (ws, request) => {
      console.log("New WebSocket connection")

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString())
          this.handleMessage(ws, data)
        } catch (error) {
          console.error("Invalid WebSocket message:", error)
          ws.send(JSON.stringify({ error: "Invalid message format" }))
        }
      })

      ws.on("close", () => {
        this.handleDisconnection(ws)
      })

      ws.on("error", (error) => {
        console.error("WebSocket error:", error)
      })
    })

    console.log("WebSocket server initialized")
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case "authenticate":
        this.authenticateClient(ws, data.token)
        break

      case "join_room":
        this.joinRoom(ws, data.roomId)
        break

      case "leave_room":
        this.leaveRoom(ws, data.roomId)
        break

      case "typing_start":
        this.broadcastTyping(ws, data.postId, true)
        break

      case "typing_stop":
        this.broadcastTyping(ws, data.postId, false)
        break

      default:
        ws.send(JSON.stringify({ error: "Unknown message type" }))
    }
  }

  authenticateClient(ws, token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      ws.userId = decoded.userId
      this.clients.set(decoded.userId, ws)

      ws.send(
        JSON.stringify({
          type: "authenticated",
          userId: decoded.userId,
        }),
      )

      console.log(`User ${decoded.userId} authenticated via WebSocket`)
    } catch (error) {
      ws.send(JSON.stringify({ error: "Authentication failed" }))
      ws.close()
    }
  }

  joinRoom(ws, roomId) {
    if (!ws.userId) {
      ws.send(JSON.stringify({ error: "Not authenticated" }))
      return
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }

    this.rooms.get(roomId).add(ws.userId)
    ws.currentRoom = roomId

    ws.send(
      JSON.stringify({
        type: "joined_room",
        roomId,
      }),
    )

    // Notify other users in the room
    this.broadcastToRoom(roomId, {
      type: "user_joined",
      userId: ws.userId,
    })
  }

  leaveRoom(ws, roomId) {
    if (!ws.userId || !this.rooms.has(roomId)) return

    this.rooms.get(roomId).delete(ws.userId)
    if (this.rooms.get(roomId).size === 0) {
      this.rooms.delete(roomId)
    }

    ws.currentRoom = null

    // Notify other users in the room
    this.broadcastToRoom(roomId, {
      type: "user_left",
      userId: ws.userId,
    })
  }

  broadcastTyping(ws, postId, isTyping) {
    if (!ws.userId) return

    this.broadcastToRoom(`post_${postId}`, {
      type: "typing_update",
      userId: ws.userId,
      isTyping,
      postId,
    })
  }

  broadcastToRoom(roomId, message) {
    if (!this.rooms.has(roomId)) return

    const userIds = this.rooms.get(roomId)
    userIds.forEach((userId) => {
      const client = this.clients.get(userId)
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }

  broadcastToUser(userId, message) {
    const client = this.clients.get(userId)
    if (client && client.readyState === client.OPEN) {
      client.send(JSON.stringify(message))
    }
  }

  broadcastToAll(message) {
    this.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }

  handleDisconnection(ws) {
    if (ws.userId) {
      this.clients.delete(ws.userId)

      // Remove from all rooms
      this.rooms.forEach((userIds, roomId) => {
        if (userIds.has(ws.userId)) {
          userIds.delete(ws.userId)
          if (userIds.size === 0) {
            this.rooms.delete(roomId)
          } else {
            this.broadcastToRoom(roomId, {
              type: "user_left",
              userId: ws.userId,
            })
          }
        }
      })

      console.log(`User ${ws.userId} disconnected`)
    }
  }
}

// Global WebSocket server instance
export const wsServer = new CommunityWebSocketServer()

// Helper function to broadcast messages from API routes
export function broadcastToClients(type, data) {
  if (wsServer.wss) {
    wsServer.broadcastToAll({
      type,
      data,
      timestamp: new Date().toISOString(),
    })
  }
}

// Helper function to create notifications
export async function createNotification(db, notificationData) {
  const notifications = db.collection("notifications")
  return await notifications.insertOne({
    ...notificationData,
    isRead: false,
    createdAt: new Date(),
  })
}
