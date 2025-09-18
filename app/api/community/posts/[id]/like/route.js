// Post Like/Unlike API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../../../lib/auth/auth.js"
import { createNotification } from "../../../../../../lib/notifications/create.js"
import { broadcastToClients } from "../../../../../../lib/broadcast/broadcast.js"

const authService = new AuthService()

// POST /api/community/posts/[id]/like - Toggle like on post
export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params

    const { db } = await connectToDatabase()
    const posts = db.collection("community_posts")

    const post = await posts.findOne({ _id: new ObjectId(id) })
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const userId = new ObjectId(decoded.userId)
    const likes = post.likes || []
    const hasLiked = likes.some((like) => like.toString() === userId.toString())

    let result
    let action

    if (hasLiked) {
      // Unlike the post
      result = await posts.updateOne({ _id: new ObjectId(id) }, { $pull: { likes: userId } })
      action = "unliked"
    } else {
      // Like the post
      result = await posts.updateOne({ _id: new ObjectId(id) }, { $addToSet: { likes: userId } })
      action = "liked"

      // Create notification for post author (if not self-like)
      if (post.userId.toString() !== decoded.userId) {
        await createNotification(db, {
          userId: post.userId,
          type: "post_like",
          title: "Someone liked your post",
          message: `Your post "${post.title}" received a new like`,
          data: { postId: id, action: "like" },
        })
      }
    }

    // Get updated like count
    const updatedPost = await posts.findOne({ _id: new ObjectId(id) })
    const likesCount = updatedPost.likes?.length || 0

    // Broadcast like update to connected clients
    broadcastToClients("post_like_update", {
      postId: id,
      likesCount,
      action,
      userId: decoded.userId,
    })

    return NextResponse.json({
      success: true,
      action,
      likesCount,
      message: `Post ${action} successfully`,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
