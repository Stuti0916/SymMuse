import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth/auth.js"

const authService = new AuthService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const result = await authService.login(email, password)

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        token: result.token,
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
