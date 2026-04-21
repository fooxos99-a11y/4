import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get("student_id")
    const student_ids = searchParams.get("student_ids")

    if (student_ids) {
      const requestedIds = Array.from(new Set(
        student_ids
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ))

      if (requestedIds.length === 0) {
        return NextResponse.json({ achievementsByStudent: {} })
      }

      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .in("student_id", requestedIds)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching achievements batch:", error)
        return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
      }

      const grouped = Object.fromEntries(requestedIds.map((id) => [id, [] as any[]]))
      for (const achievement of data || []) {
        const key = String(achievement.student_id || "")
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(achievement)
      }

      return NextResponse.json({ achievementsByStudent: grouped })
    }

    let query = supabase.from("achievements").select("*").order("created_at", { ascending: false })
    if (student_id) {
      query = query.eq("student_id", student_id)
    } else {
      // الصفحة العامة: لا تُظهر الإنجازات الشخصية المضافة من الإدارة
      query = query.neq("achievement_type", "personal")
    }
    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching achievements:", error)
      return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
    }

    return NextResponse.json({ achievements: data || [] })
  } catch (error) {
    console.error("[v0] Error in GET /api/achievements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[DEBUG] POST /api/achievements body:", body)

    const { student_name, student_id, title, category, date, description, status, level, icon_type, image_url, achievement_type } = body;

    const supabase = await createServerSupabaseClient();
    const achievementData: any = {
      title,
      date,
      description,
      status: status || "مكتمل",
      level: level || "ممتاز",
      icon_type: icon_type || "trophy",
      image_url: image_url || null,
      achievement_type: achievement_type || "student",
    };
    if (student_name) achievementData.student_name = student_name;
    achievementData.category = category || "";
    if (student_id) achievementData.student_id = student_id;

    const { data, error } = await supabase
      .from("achievements")
      .insert([achievementData])
      .select();

    if (error) {
      console.error("[v0] Error creating achievement:", error)
      console.error("[DEBUG] achievementData:", achievementData)
      if (error.details) console.error("[DEBUG] error.details:", error.details)
      if (error.hint) console.error("[DEBUG] error.hint:", error.hint)
      if (error.code) console.error("[DEBUG] error.code:", error.code)
      return NextResponse.json({ error: error.message || "Failed to create achievement", details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, achievement: data[0] })
  } catch (error) {
    console.error("[v0] Error in POST /api/achievements:", error)
    return NextResponse.json({ error: error.message || "Internal server error", details: error }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Achievement ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from("achievements").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting achievement:", error)
      return NextResponse.json({ error: "Failed to delete achievement" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/achievements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
