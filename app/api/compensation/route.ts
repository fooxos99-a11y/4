import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { ensureStudentAccess, ensureTeacherScope, isTeacherRole, requireRoles } from "@/lib/auth/guards"
import { getPlanSessionContent, resolvePlanTotalDays } from "@/lib/quran-data"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { isEvaluatedAttendance } from "@/lib/student-attendance"

// POST /api/compensation
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const {
      student_id,
      teacher_id,
      halaqah,
      date,
    } = await request.json()

    if (!student_id || !teacher_id || !halaqah || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, halaqah, teacher_id)
    if (teacherScopeError) {
      return teacherScopeError
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const effectiveTeacherId = isTeacherRole(session.role) ? session.id : teacher_id

    const { data: plans } = await supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", student_id)
      .eq("semester_id", activeSemester.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0 || !plans[0].start_date) {
      return NextResponse.json({ error: "لا توجد خطة حفظ نشطة لهذا الطالب" }, { status: 409 })
    }

    const plan = plans[0]
    const today = new Date()
    const saDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    const todayStr = saDate.toISOString().split("T")[0]

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level)")
      .eq("student_id", student_id)
      .eq("semester_id", activeSemester.id)
      .gte("date", plan.start_date)
      .lte("date", todayStr)
      .order("date", { ascending: true })

    const advancingLevels = new Set(["excellent", "good", "very_good"])
    const totalSessions = resolvePlanTotalDays(plan)
    const scheduledDates: string[] = []
    const pointerDate = new Date(plan.start_date)

    while (pointerDate <= saDate && scheduledDates.length < totalSessions) {
      const dayOfWeek = pointerDate.getDay()
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        scheduledDates.push(pointerDate.toISOString().split("T")[0])
      }
      pointerDate.setDate(pointerDate.getDate() + 1)
    }

    const passingRecords = (attendanceRecords || []).filter((record: any) => {
      if (!isEvaluatedAttendance(record.status)) {
        return false
      }

      const evaluations = Array.isArray(record.evaluations)
        ? record.evaluations
        : record.evaluations
          ? [record.evaluations]
          : []

      if (evaluations.length === 0) {
        return false
      }

      const latestEvaluation = evaluations[evaluations.length - 1]
      return advancingLevels.has(latestEvaluation?.hafiz_level ?? "")
    })

    const sessionProgress = getScheduledSessionProgress(passingRecords, scheduledDates)
    const pendingSessionIndices = sessionProgress.pendingSessionIndices

    if (pendingSessionIndices.length === 0) {
      return NextResponse.json({ error: "لا توجد أيام مستحقة للتعويض" }, { status: 409 })
    }

    const nextSessionIndex = pendingSessionIndices[0]
    const expectedDate = scheduledDates[nextSessionIndex - 1]
    if (!expectedDate || date !== expectedDate) {
      return NextResponse.json({ error: "يجب تعويض أقدم يوم فائت أولاً" }, { status: 409 })
    }

    const dailyStr = String(plan.daily_pages)
    const normalizedDailyPages = dailyStr === "0.3333" ? 0.3333 : dailyStr === "0.25" ? 0.25 : plan.daily_pages
    const sessionContent = getPlanSessionContent(
      {
        ...plan,
        daily_pages: normalizedDailyPages,
      },
      nextSessionIndex,
    )

    if (!sessionContent) {
      return NextResponse.json({ error: "تعذر تحديد مقطع التعويض التالي" }, { status: 409 })
    }

    const compensationNote = `نجح بتعويض: ${sessionContent.text}`

    const { data: existingCompensation } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", student_id)
      .eq("semester_id", activeSemester.id)
      .eq("date", date)
      .eq("is_compensation", true)
      .maybeSingle()

    if (existingCompensation) {
      return NextResponse.json({ error: "تم تسجيل هذا التعويض مسبقًا" }, { status: 409 })
    }

    const { data: newRecord, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        student_id,
        teacher_id: effectiveTeacherId,
        halaqah,
        date,
        semester_id: activeSemester.id,
        status: "present",
        is_compensation: true,
        notes: compensationNote,
      })
      .select("id")
      .single()

    if (insertError) {
      if (`${insertError.code ?? ""}` === "23505") {
        return NextResponse.json({ error: "تم تسجيل هذا التعويض مسبقًا" }, { status: 409 })
      }
      throw insertError
    }
    const recordId = newRecord.id

    // 2. تثبيت تقييم التعويض مع نفس النطاق الحفظي حتى يظهر في الملف الشخصي
    await supabase.from("evaluations").delete().eq("attendance_record_id", recordId)

    const { error: evaluationError } = await supabase.from("evaluations").insert({
      attendance_record_id: recordId,
      hafiz_level: "good",
      tikrar_level: "not_completed",
      samaa_level: "not_completed",
      rabet_level: "not_completed",
      hafiz_from_surah: sessionContent.fromSurah || null,
      hafiz_from_verse: sessionContent.fromVerse || null,
      hafiz_to_surah: sessionContent.toSurah || null,
      hafiz_to_verse: sessionContent.toVerse || null,
    })

    if (evaluationError) {
      throw evaluationError
    }

    // 3. إضافة 5 نقاط للطالب
    const { data: studentData } = await supabase
      .from("students")
      .select("points, store_points")
      .eq("id", student_id)
      .single()

    const newPoints = (studentData?.points || 0) + 5
    const newStorePoints = (studentData?.store_points || 0) + 5
    await supabase
      .from("students")
      .update({ points: newPoints, store_points: newStorePoints })
      .eq("id", student_id)

    return NextResponse.json({ success: true, newPoints })
  } catch (error: any) {
    console.error("[compensation error]", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل تسجيل التعويض." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
