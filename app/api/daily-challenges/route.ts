import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Return empty for now - client will handle localStorage
    return NextResponse.json({ challenge: null, schedule: [] })
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ challenge: null, schedule: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Just echo back success - client handles localStorage storage
    return NextResponse.json({ challenge: body, success: true })
  } catch (error: any) {
    console.error("[v0] Server error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
