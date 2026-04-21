import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { studentId, effect } = await request.json()

    if (!studentId || effect === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await supabase
      .from("student_preferences")
      .upsert({ student_id: studentId, active_effect: effect }, { onConflict: "student_id" })

    if (error) {
      console.error("[v0] Error saving effect:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in effects POST:", error)
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
      .select("active_effect")
      .eq("student_id", studentId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching effect:", error)
    }

    return NextResponse.json({
      success: true,
      active_effect: data?.active_effect || null,
    })
  } catch (error: any) {
    console.error("[v0] Error in effects GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
