import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import {
  hydrateArchivedRecitationStudent,
  normalizeRecitationDayPortions,
  shouldIncludeArchivedRecitationStudent,
} from "@/lib/recitation-days"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRoles(_, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { id } = await context.params
    const supabase = createAdminClient()
    const { data: day, error: dayError } = await supabase
      .from("recitation_days")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (dayError) {
      throw dayError
    }

    if (!day) {
      return NextResponse.json({ error: "يوم السرد غير موجود" }, { status: 404 })
    }

    const { data: students, error: studentsError } = await supabase
      .from("recitation_day_students")
      .select("*")
      .eq("recitation_day_id", id)
      .order("student_name", { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    const studentIds = (students || []).map((student) => student.id)
    const { data: portions, error: portionsError } = studentIds.length
      ? await supabase
          .from("recitation_day_portions")
          .select("*")
          .in("recitation_day_student_id", studentIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null }

    if (portionsError) {
      throw portionsError
    }

    const normalizedPortions = await normalizeRecitationDayPortions(supabase, students || [], portions || [])

    const portionsByStudentId = new Map<string, any[]>()
    for (const portion of normalizedPortions) {
      const current = portionsByStudentId.get(portion.recitation_day_student_id) || []
      current.push(portion)
      portionsByStudentId.set(portion.recitation_day_student_id, current)
    }

    const enrichedStudents = (students || []).map((student) => hydrateArchivedRecitationStudent({
      ...student,
      portions: portionsByStudentId.get(student.id) || [],
    }))

    const archiveReadyStudents = day.status === "archived"
      ? enrichedStudents.filter((student) => shouldIncludeArchivedRecitationStudent(student))
      : enrichedStudents

    return NextResponse.json({
      day,
      students: archiveReadyStudents,
      halaqahOptions: Array.from(new Set(archiveReadyStudents.map((student) => String(student.halaqah || "").trim()).filter(Boolean))).sort(),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: day, error: dayError } = await supabase
      .from("recitation_days")
      .select("id, status")
      .eq("id", id)
      .maybeSingle()

    if (dayError) {
      throw dayError
    }

    if (!day) {
      return NextResponse.json({ error: "يوم السرد غير موجود" }, { status: 404 })
    }

    if (day.status !== "archived") {
      return NextResponse.json({ error: "لا يمكن حذف يوم سرد غير مؤرشف" }, { status: 409 })
    }

    const { data: students, error: studentsError } = await supabase
      .from("recitation_day_students")
      .select("id")
      .eq("recitation_day_id", id)

    if (studentsError) {
      throw studentsError
    }

    const studentIds = (students || []).map((student) => student.id)
    if (studentIds.length > 0) {
      const { error: portionsDeleteError } = await supabase
        .from("recitation_day_portions")
        .delete()
        .in("recitation_day_student_id", studentIds)

      if (portionsDeleteError) {
        throw portionsDeleteError
      }

      const { error: studentsDeleteError } = await supabase
        .from("recitation_day_students")
        .delete()
        .eq("recitation_day_id", id)

      if (studentsDeleteError) {
        throw studentsDeleteError
      }
    }

    const { error: dayDeleteError } = await supabase
      .from("recitation_days")
      .delete()
      .eq("id", id)

    if (dayDeleteError) {
      throw dayDeleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}