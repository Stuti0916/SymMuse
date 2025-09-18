// Premium Features API
import { NextResponse } from "next/server"
import { AuthService } from "../../../../lib/auth/auth"
import { PremiumAccessControl } from "../../../../lib/premium/access-control.js"

const authService = new AuthService()

// GET /api/premium/features - Get user's premium features and status
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    const decoded = authService.verifyToken(token)

    // Get premium status
    const premiumStatus = await PremiumAccessControl.getUserPremiumStatus(decoded.userId)

    // Get consultation limits
    const consultationLimits = await PremiumAccessControl.checkConsultationLimit(decoded.userId)

    return NextResponse.json({
      success: true,
      premium: {
        ...premiumStatus,
        consultationLimits,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
