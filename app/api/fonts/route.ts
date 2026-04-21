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
        .select("active_font")
        .eq("student_id", studentId)
        .single()

      if (error || !data) {
        return NextResponse.json({ fonts: {} }, { headers: { "Cache-Control": "private, no-store" } })
      }
      const fonts: Record<string, string> = {}
      if (data.active_font) fonts[studentId] = data.active_font
      return NextResponse.json({ fonts }, { headers: { "Cache-Control": "private, no-store" } })
    }

    // جلب كل الخطوط
    const { data, error } = await supabase
      .from("student_preferences")
      .select("student_id, active_font")

    if (error || !data) {
      return NextResponse.json({ fonts: {} })
    }

    const fonts: Record<string, string> = {}
    for (const row of data) {
      if (row.active_font) fonts[row.student_id] = row.active_font
    }

    return NextResponse.json({ fonts }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (error) {
    console.error("[fonts] Error fetching fonts:", error)
    return NextResponse.json({ fonts: {} }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { student_id, font_id } = await request.json()

    if (!student_id || !font_id) {
      return NextResponse.json({ error: "Missing student_id or font_id" }, { status: 400 })
    }

    const { error } = await supabase
      .from("student_preferences")
      .upsert(
        { student_id, active_font: font_id },
        { onConflict: "student_id" }
      )

    if (error) {
      console.error("[fonts] Error saving font:", error)
      return NextResponse.json({ error: "Failed to save font" }, { status: 500 })
    }

    const fonts: Record<string, string> = { [student_id]: font_id }
    return NextResponse.json({ success: true, fonts })
  } catch (error) {
    console.error("[fonts] Error saving font:", error)
    return NextResponse.json({ error: "Failed to save font" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { student_id } = await request.json()

    if (!student_id) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    const { error } = await supabase
      .from("student_preferences")
      .update({ active_font: null })
      .eq("student_id", student_id)

    if (error) {
      console.error("[fonts] Error clearing font:", error)
      return NextResponse.json({ error: "Failed to clear font" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[fonts] Error in DELETE /api/fonts:", error)
    return NextResponse.json({ error: "Failed to clear font" }, { status: 500 })
  }
}
