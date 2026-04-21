import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureTeacherScope, requireRoles } from "@/lib/auth/guards"

function isMissingStudentHafizExtrasTable(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /student_hafiz_extras/i.test(message) && /does not exist|not exist|relation|table/i.test(message)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const circle = searchParams.get("circle")

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, circle)
    if (teacherScopeError) {
      return teacherScopeError
    }

    const supabase = createAdminClient()

    let query = supabase.from("attendance_records").select("id, student_id, status, date, notes, is_compensation").eq("date", date)

    if (circle) {
      query = query.eq("halaqah", circle)
    }

    const { data: records, error } = await query.order("id", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching attendance records:", error)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    const attendanceRecordIds = (records || []).map((record: any) => record.id)
    const { data: hafizExtraRows, error: hafizExtraError } = attendanceRecordIds.length > 0
      ? await supabase
          .from("student_hafiz_extras")
          .select("attendance_record_id, extra_pages")
          .in("attendance_record_id", attendanceRecordIds)
      : { data: [], error: null }

    if (hafizExtraError && !isMissingStudentHafizExtrasTable(hafizExtraError)) {
      console.error("[attendance-by-date] Error fetching hafiz extras:", hafizExtraError)
      return NextResponse.json({ error: "Failed to fetch hafiz extras" }, { status: 500 })
    }

    const hafizExtrasByAttendanceRecordId = new Map(
      (hafizExtraRows || []).map((row: any) => [String(row.attendance_record_id), Number(row.extra_pages) || null]),
    )

    const formattedRecords = await Promise.all(
      (records || []).map(async (record: any) => {
        // جلب بيانات الطالب
        const { data: student } = await supabase.from("students").select("name").eq("id", record.student_id).single()

        // جلب بيانات التقييم
        const { data: evaluations } = await supabase
          .from("evaluations")
          .select("hafiz_level, tikrar_level, samaa_level, rabet_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse, samaa_from_surah, samaa_from_verse, samaa_to_surah, samaa_to_verse, rabet_from_surah, rabet_from_verse, rabet_to_surah, rabet_to_verse, created_at")
          .eq("attendance_record_id", record.id)
          .order("created_at", { ascending: true })

        const latestEvaluation = Array.isArray(evaluations) ? evaluations[evaluations.length - 1] : null

        return {
          student_id: record.student_id,
          student_name: student?.name || "Unknown",
          date: record.date,
          status: record.status,
          notes: record.notes ?? null,
          is_compensation: !!record.is_compensation,
          hafiz_level: latestEvaluation?.hafiz_level || null,
          tikrar_level: latestEvaluation?.tikrar_level || null,
          samaa_level: latestEvaluation?.samaa_level || null,
          rabet_level: latestEvaluation?.rabet_level || null,
          hafiz_from_surah: latestEvaluation?.hafiz_from_surah || null,
          hafiz_from_verse: latestEvaluation?.hafiz_from_verse || null,
          hafiz_to_surah: latestEvaluation?.hafiz_to_surah || null,
          hafiz_to_verse: latestEvaluation?.hafiz_to_verse || null,
          samaa_from_surah: latestEvaluation?.samaa_from_surah || null,
          samaa_from_verse: latestEvaluation?.samaa_from_verse || null,
          samaa_to_surah: latestEvaluation?.samaa_to_surah || null,
          samaa_to_verse: latestEvaluation?.samaa_to_verse || null,
          rabet_from_surah: latestEvaluation?.rabet_from_surah || null,
          rabet_from_verse: latestEvaluation?.rabet_from_verse || null,
          rabet_to_surah: latestEvaluation?.rabet_to_surah || null,
          rabet_to_verse: latestEvaluation?.rabet_to_verse || null,
          hafiz_extra_pages: hafizExtrasByAttendanceRecordId.get(String(record.id)) || null,
        }
      }),
    )

    const response = NextResponse.json({ records: formattedRecords, count: formattedRecords.length })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return response
  } catch (error) {
    console.error("[v0] Error in attendance-by-date API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
