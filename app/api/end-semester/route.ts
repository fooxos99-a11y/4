import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireRoles } from "@/lib/auth/guards"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { buildSemesterArchiveData } from "@/lib/semester-archive"
import { SURAHS, getLegacyPreviousMemorizationFields, getPlanMemorizedRanges, normalizePreviousMemorizationRanges } from "@/lib/quran-data"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { getSaudiDateString } from "@/lib/saudi-time"

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

function getNormalizedEndVerse(endSurahNumber: number, endVerse?: number | null) {
  if (endVerse && endVerse > 0) return endVerse
  return SURAHS.find((surah) => surah.number === endSurahNumber)?.verseCount ?? null
}

function hasCompletedMemorization(record: any) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if ((record.status !== "present" && record.status !== "late") || evaluations.length === 0) {
    return false
  }

  const latestEvaluation = evaluations[evaluations.length - 1]
  return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
}

function isMissingArchiveActiveSemesterFunction(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /archive_active_semester_atomic/i.test(message) && /does not exist|not exist|function|rpc/i.test(message)
}

function getScheduledStudyDates(startDate: string, maxSessions: number, endDate = getSaudiDateString()) {
  const scheduledDates: string[] = []
  const currentDate = new Date(startDate)
  const lastDate = new Date(endDate)

  while (currentDate <= lastDate && scheduledDates.length < maxSessions) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      scheduledDates.push(currentDate.toISOString().split("T")[0])
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return scheduledDates
}

function getCompletedDaysForPlan(plan: any, attendanceRecords: any[] = []) {
  if (!plan?.start_date) {
    return 0
  }

  const totalSessions = Number(plan.total_days) > 0
    ? Number(plan.total_days)
    : (Number(plan.total_pages) > 0 && Number(plan.daily_pages) > 0
        ? Math.max(0, Math.ceil(Number(plan.total_pages) / Number(plan.daily_pages)))
        : 0)

  const scheduledDates = getScheduledStudyDates(plan.start_date, totalSessions)
  const passingRecords = (attendanceRecords || [])
    .filter((record) => !record?.date || String(record.date) >= String(plan.start_date))
    .filter(hasCompletedMemorization)

  return getScheduledSessionProgress(passingRecords, scheduledDates).completedDays
}

function getMergedMemorizedRange(student: any, plan: any) {
  const storedRanges = normalizePreviousMemorizationRanges(student?.memorized_ranges)
  const normalizedPlan = {
    ...plan,
    direction: plan?.direction || "asc",
    has_previous: plan?.has_previous || storedRanges.length > 0 || !!(plan?.prev_start_surah || student?.memorized_start_surah),
    prev_start_surah: plan?.prev_start_surah || student?.memorized_start_surah || null,
    prev_start_verse: plan?.prev_start_verse || student?.memorized_start_verse || null,
    prev_end_surah: plan?.prev_end_surah || student?.memorized_end_surah || null,
    prev_end_verse: plan?.prev_end_verse || student?.memorized_end_verse || null,
    previous_memorization_ranges: normalizePreviousMemorizationRanges([
      ...storedRanges,
      ...normalizePreviousMemorizationRanges(plan?.previous_memorization_ranges),
    ]),
  }

  const memorizedRanges = getPlanMemorizedRanges(normalizedPlan, Number(plan?.completedDays) || 0)

  if (memorizedRanges.length > 0) {
    const legacyFields = getLegacyPreviousMemorizationFields(memorizedRanges)

    return {
      memorized_start_surah: legacyFields.prev_start_surah,
      memorized_start_verse: legacyFields.prev_start_verse,
      memorized_end_surah: legacyFields.prev_end_surah,
      memorized_end_verse: legacyFields.prev_end_verse,
      memorized_ranges: memorizedRanges,
    }
  }

  const inheritedStartSurah =
    student?.memorized_start_surah ||
    normalizedPlan?.prev_start_surah ||
    normalizedPlan?.start_surah_number ||
    null
  const inheritedStartVerse =
    student?.memorized_start_verse ||
    normalizedPlan?.prev_start_verse ||
    normalizedPlan?.start_verse ||
    1
  const endSurah =
    student?.memorized_end_surah ||
    normalizedPlan?.prev_end_surah ||
    normalizedPlan?.end_surah_number ||
    null
  const endVerse = endSurah
    ? getNormalizedEndVerse(
        endSurah,
        student?.memorized_end_verse || normalizedPlan?.prev_end_verse || normalizedPlan?.end_verse,
      )
    : null

  return {
    memorized_start_surah: inheritedStartSurah,
    memorized_start_verse: inheritedStartVerse,
    memorized_end_surah: endSurah,
    memorized_end_verse: endVerse,
    memorized_ranges: storedRanges.length > 0 ? storedRanges : null,
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const adminSupabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const body = await request.json()
    const semesterName = String(body.name || "").trim()

    if (!semesterName) {
      return NextResponse.json({ error: "اسم الفصل مطلوب" }, { status: 400 })
    }

    const { data: existingSemester } = await supabase
      .from("semesters")
      .select("id, name")
      .neq("id", activeSemester.id)
      .ilike("name", semesterName)
      .maybeSingle()

    if (existingSemester?.id) {
      return NextResponse.json({ error: "يوجد فصل محفوظ بنفس الاسم بالفعل" }, { status: 400 })
    }

    const { data: plans, error: plansError } = await supabase
      .from("student_plans")
      .select("student_id, start_surah_number, start_verse, end_surah_number, end_verse, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges, total_pages, total_days, daily_pages, direction, start_date, has_previous, created_at")
      .eq("semester_id", activeSemester.id)
      .order("created_at", { ascending: false })

    if (plansError) {
      return NextResponse.json({ error: plansError.message || "فشل في جلب الخطط الحالية" }, { status: 500 })
    }

    const archivedAt = new Date().toISOString()
    const archivedEndDate = getSaudiDateString()

    const [attendanceResult, invoicesResult, expensesResult, incomesResult, tripsResult] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("id, student_id, halaqah, date, status, notes, is_compensation, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
        .eq("semester_id", activeSemester.id)
        .order("date", { ascending: false }),
      supabase
        .from("finance_invoices")
        .select("id, title, vendor, invoice_number, amount, issue_date, due_date, status")
        .eq("semester_id", activeSemester.id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("finance_expenses")
        .select("id, title, beneficiary, payment_method, amount, expense_date")
        .eq("semester_id", activeSemester.id)
        .order("expense_date", { ascending: false }),
      supabase
        .from("finance_incomes")
        .select("id, title, source, amount, income_date")
        .eq("semester_id", activeSemester.id)
        .order("income_date", { ascending: false }),
      supabase
        .from("finance_trips")
        .select("id, title, trip_date, costs")
        .eq("semester_id", activeSemester.id)
        .order("trip_date", { ascending: false }),
    ])

    if (attendanceResult.error) throw attendanceResult.error
    if (invoicesResult.error) throw invoicesResult.error
    if (expensesResult.error) throw expensesResult.error
    if (incomesResult.error) throw incomesResult.error
    if (tripsResult.error) throw tripsResult.error

    const semesterStudentIds = Array.from(
      new Set(
        [...(plans || []).map((plan) => String(plan.student_id || "")), ...(attendanceResult.data || []).map((row) => String(row.student_id || ""))].filter(Boolean),
      ),
    )

    const { data: students, error: studentsError } = semesterStudentIds.length > 0
      ? await supabase
          .from("students")
          .select("id, name, account_number, halaqah, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges")
          .in("id", semesterStudentIds)
      : { data: [], error: null }

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message || "فشل في جلب الطلاب" }, { status: 500 })
    }

    const latestPlanByStudentId = new Map<string, any>()
    for (const plan of plans || []) {
      const studentId = String(plan.student_id || "")
      if (!studentId || latestPlanByStudentId.has(studentId)) {
        continue
      }

      latestPlanByStudentId.set(studentId, plan)
    }

    const attendanceByStudentId = new Map<string, any[]>()
    for (const attendanceRecord of attendanceResult.data || []) {
      const studentId = String(attendanceRecord.student_id || "")
      if (!studentId) {
        continue
      }

      const existing = attendanceByStudentId.get(studentId)
      if (existing) {
        existing.push(attendanceRecord)
      } else {
        attendanceByStudentId.set(studentId, [attendanceRecord])
      }
    }

    const studentUpdates = (students || []).map((student) => {
      const plan = latestPlanByStudentId.get(String(student.id))
      const updateData: Record<string, unknown> = {
        id: student.id,
        points: 0,
        store_points: 0,
      }

      if (plan) {
        const completedDays = getCompletedDaysForPlan(plan, attendanceByStudentId.get(String(student.id)) || [])
        Object.assign(updateData, getMergedMemorizedRange(student, { ...plan, completedDays }))
      }

      return updateData
    })

    const archivedPlansCount = Array.from(latestPlanByStudentId.keys()).length

    const studentMap = new Map<string, { id: string; name?: string | null; account_number?: number | null; halaqah?: string | null }>()

    for (const student of students || []) {
      studentMap.set(String(student.id), student)
    }

    const archiveBundle = buildSemesterArchiveData({
      plansRows: plans || [],
      attendanceRows: attendanceResult.data || [],
      invoiceRows: invoicesResult.data || [],
      expenseRows: expensesResult.data || [],
      incomeRows: incomesResult.data || [],
      tripRows: tripsResult.data || [],
      studentMap,
      generatedAt: archivedAt,
    })

    const { error: archiveError } = await adminSupabase.rpc("archive_active_semester_atomic", {
      p_active_semester_id: activeSemester.id,
      p_archived_semester_name: semesterName,
      p_archived_at: archivedAt,
      p_archived_end_date: archivedEndDate,
      p_archive_snapshot: archiveBundle.snapshot,
      p_student_updates: studentUpdates,
    })

    if (archiveError) {
      if (isMissingArchiveActiveSemesterFunction(archiveError)) {
        return NextResponse.json({ error: "دالة إنهاء الفصل الذرية غير موجودة بعد. نفذ ملف scripts/055_create_archive_active_semester_atomic.sql ثم أعد المحاولة." }, { status: 503 })
      }

      const columnsMissing = /memorized_start_surah|memorized_end_surah|column/i.test(
        `${archiveError.message ?? ""} ${archiveError.details ?? ""}`,
      )

      return NextResponse.json(
        {
          error: columnsMissing
            ? "حقول محفوظ الطالب غير موجودة بعد. نفذ ملف scripts/043_add_student_memorized_fields.sql و scripts/049_add_previous_memorization_ranges.sql ثم أعد المحاولة."
            : archiveError.message || "فشل في إنهاء الفصل",
          details: archiveError.details ?? null,
          hint: archiveError.hint ?? null,
          code: archiveError.code ?? null,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      archivedSemesterName: semesterName,
      newSemester: null,
      studentsReset: studentUpdates.length,
      plansArchived: archivedPlansCount,
      accountsPreserved: true,
    })
  } catch (error) {
    console.error("[end-semester] POST error:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط لإنهائه. ابدأ فصلًا جديدًا أولاً." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: "حدث خطأ أثناء إنهاء الفصل" }, { status: 500 })
  }
}
