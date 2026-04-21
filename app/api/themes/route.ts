import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const revalidate = 300

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// GET: جلب المظاهر من Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (studentId) {
      const { data, error } = await supabase
        .from("students")
        .select("preferred_theme")
        .eq("id", studentId)
        .single()

      if (error || !data) {
        return NextResponse.json({ theme: null }, { headers: { "Cache-Control": "private, no-store" } })
      }
      return NextResponse.json({ theme: data.preferred_theme || null }, { headers: { "Cache-Control": "private, no-store" } })
    }

    // جلب كل المظاهر
    const { data, error } = await supabase
      .from("students")
      .select("id, preferred_theme")

    if (error || !data) {
      return NextResponse.json({ themes: {} })
    }

    const themes: Record<string, string> = {}
    for (const row of data) {
      if (row.preferred_theme) themes[row.id] = row.preferred_theme
    }

    return NextResponse.json({ themes }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
  } catch (error: any) {
    console.error("[themes] Error fetching themes:", error)
    const studentId = new URL(request.url).searchParams.get("studentId")
    return NextResponse.json(studentId ? { theme: null } : { themes: {} }, studentId ? { headers: { "Cache-Control": "private, no-store" } } : { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } })
  }
}

// POST: حفظ مظهر طالب في Supabase
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { studentId, theme } = await request.json()

    if (!studentId || !theme) {
      return NextResponse.json({ error: "Missing studentId or theme" }, { status: 400 })
    }

    const { error } = await supabase
      .from("students")
      .update({ preferred_theme: theme })
      .eq("id", studentId)

    if (error) {
      console.error("[themes] Error saving theme:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[themes] Error saving theme:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
