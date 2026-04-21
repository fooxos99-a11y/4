import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const revalidate = 300

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (studentId) {
      const { data, error } = await supabase
        .from("student_preferences")
        .select("active_badge")
        .eq("student_id", studentId)
        .single()

      if (error || !data) {
        return NextResponse.json({ badge: null }, { headers: { "Cache-Control": "private, no-store" } })
      }
      return NextResponse.json({ badge: data.active_badge || null }, { headers: { "Cache-Control": "private, no-store" } })
    }

    // جلب كل الشارات
    const { data, error } = await supabase
      .from("student_preferences")
      .select("student_id, active_badge")

    if (error || !data) {
      return NextResponse.json({ badges: {} })
    }

    const badges: Record<string, string> = {}
    for (const row of data) {
      if (row.active_badge) badges[row.student_id] = row.active_badge
    }

    return NextResponse.json({ badges }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (error) {
    console.error("[badges] Error in GET /api/badges:", error)
    return NextResponse.json({ badges: {} }, { status: 500, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { studentId, badge } = await request.json()

    if (!studentId || !badge) {
      return NextResponse.json({ error: "Student ID and badge required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("student_preferences")
      .upsert(
        { student_id: studentId, active_badge: badge },
        { onConflict: "student_id" }
      )

    if (error) {
      console.error("[badges] Error saving badge:", error)
      return NextResponse.json({ error: "Failed to save badge" }, { status: 500 })
    }

    return NextResponse.json({ success: true, badge })
  } catch (error) {
    console.error("[badges] Error in POST /api/badges:", error)
    return NextResponse.json({ error: "Failed to save badge" }, { status: 500 })
  }
}
