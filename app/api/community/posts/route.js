// Community Posts API Routes
import { NextResponse } from "next/server"
import { connectToDatabase, DatabaseOperations } from "../../../../lib/database/mongodb.js"
import { AuthService } from "../../../../lib/auth/auth.js"
import { broadcastToClients } from "../../../../lib/socket/socket.js" // Declare the broadcastToClients variable

const authService = new AuthService()

// GET /api/community/posts - Get community posts with pagination
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get("category")
    const page = Number.parseInt(url.searchParams.get("page")) || 1
    const limit = Number.parseInt(url.searchParams.get("limit")) || 20
    const skip = (page - 1) * limit

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    const posts = await dbOps.getCommunityPosts(category, limit, skip)

    // Populate user information for each post
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
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

        return {
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
      }),
    )

    return NextResponse.json({
      success: true,
      posts: postsWithUsers,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/community/posts - Create a new community post
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)
    const body = await request.json()

    const { title, content, category, tags, isAnonymous } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const dbOps = new DatabaseOperations(db)

    const postData = {
      userId: decoded.userId,
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      tags: tags || [],
      isAnonymous: isAnonymous || false,
      isPinned: false,
    }

    const result = await dbOps.createPost(postData)

    // Broadcast new post to connected clients
    broadcastToClients("new_post", {
      postId: result.insertedId,
      category: postData.category,
    })

    return NextResponse.json({
      success: true,
      postId: result.insertedId,
      message: "Post created successfully",
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
