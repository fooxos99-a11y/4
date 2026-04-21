import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { studentId, frame } = await request.json()

    console.log("[v0] Saving frame:", { studentId, frame })

    if (!studentId || !frame) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Upsert the active frame in student_preferences
    const { error } = await supabase
      .from("student_preferences")
      .upsert({ student_id: studentId, active_frame: frame }, { onConflict: "student_id" })

    if (error) {
      console.error("[v0] Error saving frame:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Frame saved successfully")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in frames POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("student_preferences")
      .select("active_frame")
      .eq("student_id", studentId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching frame:", error)
    }

    return NextResponse.json({
      success: true,
      active_frame: data?.active_frame || null,
    })
  } catch (error: any) {
    console.error("[v0] Error in frames GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
