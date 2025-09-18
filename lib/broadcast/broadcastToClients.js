// WebSocket broadcast utility
import { WebSocketServer } from "ws"

let wss = null

export function initializeBroadcast(server) {
  wss = new WebSocketServer({ server })
  
  wss.on("connection", (ws) => {
    console.log("Client connected to broadcast server")
    
    ws.on("close", () => {
      console.log("Client disconnected from broadcast server")
    })
  })
  
  return wss
}

export function broadcastToClients(data) {
  if (!wss) {
    console.warn("WebSocket server not initialized")
    return
  }
  
  const message = JSON.stringify(data)
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(message)
    }
  })
}

export function broadcastToUser(userId, data) {
  if (!wss) {
    console.warn("WebSocket server not initialized")
    return
  }
  
  const message = JSON.stringify({ ...data, targetUserId: userId })
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocketServer.OPEN && client.userId === userId) {
      client.send(message)
    }
  })
}
