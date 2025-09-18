import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "../../../../lib/auth/auth"

const authService = new AuthService()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    try {
      const decoded = await authService.verifyToken(token)
      return NextResponse.json({
        success: true,
        userId: decoded.userId,
      })
    } catch (error) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
