import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"
import { getPlanSessionContent, resolvePlanTotalDays } from "@/lib/quran-data"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { isEvaluatedAttendance } from "@/lib/student-attendance"

interface MissedDayItem {
  date: string
  sessionIndex: number
  content: string
  hafiz_from_surah: string
  hafiz_from_verse: string
  hafiz_to_surah: string
  hafiz_to_verse: string
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
  const activeSemester = await getOrCreateActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    // 1. Get the current active plan
    const { data: plans } = await supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("semester_id", activeSemester.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0 || !plans[0].start_date) {
      return NextResponse.json({ missedDays: [] }) // No active plan
    }

    const plan = plans[0]

    // 2. Get attendance records from start_date to today
    const today = new Date()
    const saDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    const todayStr = saDate.toISOString().split("T")[0]

    const startDate = new Date(plan.start_date)

    if (startDate > saDate) {
        return NextResponse.json({ missedDays: [] }) // Plan starts in the future or started today
    }

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level)")
      .eq("student_id", studentId)
      .eq("semester_id", activeSemester.id)
      .gte("date", plan.start_date)
      .lte("date", todayStr)
      .order("date", { ascending: true })

    const ADVANCING_LEVELS = ["excellent", "good", "very_good"]

    if (attendanceRecords) {
        for (const r of attendanceRecords) {
        if (isEvaluatedAttendance(r.status)) {
                const evals = Array.isArray(r.evaluations) ? r.evaluations : r.evaluations ? [r.evaluations] : []
                if (evals.length > 0) {
            const ev = evals[evals.length - 1]
            ADVANCING_LEVELS.includes(ev.hafiz_level ?? "")
                }
            }
        }
    }

    const totalSessions = resolvePlanTotalDays(plan)
    const scheduledDates: string[] = []
    let d = new Date(plan.start_date)

    while (d <= saDate && scheduledDates.length < totalSessions) {
      const dayOfWeek = d.getDay()
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        scheduledDates.push(d.toISOString().split("T")[0])
      }
      d.setDate(d.getDate() + 1)
    }

    const passingRecords = (attendanceRecords || []).filter((record: any) => {
      if (!isEvaluatedAttendance(record.status)) {
        return false
      }

      const evals = Array.isArray(record.evaluations) ? record.evaluations : record.evaluations ? [record.evaluations] : []
      if (evals.length === 0) {
        return false
      }

      const ev = evals[evals.length - 1]
      return ADVANCING_LEVELS.includes(ev.hafiz_level ?? "")
    })

    const sessionProgress = getScheduledSessionProgress(passingRecords, scheduledDates)
    const pendingSessionIndices = sessionProgress.pendingSessionIndices
    const missedDaysList: MissedDayItem[] = []

    if (pendingSessionIndices.length === 0) {
      return NextResponse.json({ missedDays: [] })
    }

    for (const sessionIndex of pendingSessionIndices) {
      const scheduledDate = scheduledDates[sessionIndex - 1]

      const dailyStr = String(plan.daily_pages)
      const daily = dailyStr === "0.3333" ? 0.3333 : dailyStr === "0.25" ? 0.25 : plan.daily_pages
      const sessionContent = getPlanSessionContent(
        {
          ...plan,
          daily_pages: daily,
        },
        sessionIndex,
      )

      if (!sessionContent) {
        continue
      }

      missedDaysList.push({
        date: scheduledDate,
        sessionIndex,
        content: sessionContent.text,
        hafiz_from_surah: sessionContent.fromSurah,
        hafiz_from_verse: sessionContent.fromVerse,
        hafiz_to_surah: sessionContent.toSurah,
        hafiz_to_verse: sessionContent.toVerse,
      })
    }

    return NextResponse.json({ missedDays: missedDaysList })
  } catch (error: any) {
    console.error("[compensation error]", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ missedDays: [], error: "لا يوجد فصل نشط حاليًا." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
