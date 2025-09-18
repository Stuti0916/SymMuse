// Post Comments API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../../../lib/auth/auth"
import { createNotification } from "../../../../../../lib/notifications/createNotification.js"
import { broadcastToClients } from "../../../../../../lib/broadcast/broadcastToClients.js"

const authService = new AuthService()

// POST /api/community/posts/[id]/comments - Add comment to post
export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params
    const body = await request.json()

    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const posts = db.collection("community_posts")

    const post = await posts.findOne({ _id: new ObjectId(id) })
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const comment = {
      _id: new ObjectId(),
      userId: new ObjectId(decoded.userId),
      content: content.trim(),
      likes: [],
      createdAt: new Date(),
    }

    const result = await posts.updateOne({ _id: new ObjectId(id) }, { $push: { comments: comment } })

    // Get user info for the comment
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.profilePicture": 1 } },
      )

    const commentWithUser = {
      ...comment,
      user: user
        ? {
            firstName: user.profile?.firstName || "Anonymous",
            lastName: user.profile?.lastName || "",
            profilePicture: user.profile?.profilePicture || "",
          }
        : { firstName: "Anonymous", lastName: "", profilePicture: "" },
    }

    // Create notification for post author (if not self-comment)
    if (post.userId.toString() !== decoded.userId) {
      await createNotification(db, {
        userId: post.userId,
        type: "post_comment",
        title: "New comment on your post",
        message: `Someone commented on your post "${post.title}"`,
        data: { postId: id, commentId: comment._id, action: "comment" },
      })
    }

    // Broadcast new comment to connected clients
    broadcastToClients("new_comment", {
      postId: id,
      comment: commentWithUser,
    })

    return NextResponse.json({
      success: true,
      comment: commentWithUser,
      message: "Comment added successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
