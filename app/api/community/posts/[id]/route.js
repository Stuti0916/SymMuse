// Individual Post Management API
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "../../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../../lib/auth/auth.js"

const authService = new AuthService()

// GET /api/community/posts/[id] - Get specific post with full details
export async function GET(request, { params }) {
  try {
    const { id } = params
    const { db } = await connectToDatabase()

    const post = await db.collection("community_posts").findOne({ _id: new ObjectId(id) })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Populate user information
    const user = await db
      .collection("users")
      .findOne(
        { _id: post.userId },
        { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.profilePicture": 1 } },
      )

    // Populate comment user information
    const commentsWithUsers = await Promise.all(
      post.comments.map(async (comment) => {
        const commentUser = await db
          .collection("users")
          .findOne(
            { _id: comment.userId },
            { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.profilePicture": 1 } },
          )
        return {
          ...comment,
          user: commentUser
            ? {
                firstName: commentUser.profile?.firstName || "Anonymous",
                lastName: commentUser.profile?.lastName || "",
                profilePicture: commentUser.profile?.profilePicture || "",
              }
            : { firstName: "Anonymous", lastName: "", profilePicture: "" },
        }
      }),
    )

    const postWithUser = {
      ...post,
      user: user
        ? {
            firstName: user.profile?.firstName || "Anonymous",
            lastName: user.profile?.lastName || "",
            profilePicture: user.profile?.profilePicture || "",
          }
        : { firstName: "Anonymous", lastName: "", profilePicture: "" },
      comments: commentsWithUsers,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
    }

    return NextResponse.json({
      success: true,
      post: postWithUser,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/community/posts/[id] - Update post (only by author)
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const { id } = params
    const body = await request.json()

    const { db } = await connectToDatabase()
    const posts = db.collection("community_posts")

    // Check if user owns the post
    const post = await posts.findOne({ _id: new ObjectId(id) })
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized to edit this post" }, { status: 403 })
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    const result = await posts.updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/community/posts/[id] - Delete post (only by author)
export async function DELETE(request, { params }) {
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

    // Check if user owns the post
    const post = await posts.findOne({ _id: new ObjectId(id) })
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Unauthorized to delete this post" }, { status: 403 })
    }

    const result = await posts.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
