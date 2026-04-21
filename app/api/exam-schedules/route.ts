import { NextResponse } from "next/server"

import { ensureStudentAccess, getRequestSession, isPrivilegedRole, requireRoles } from "@/lib/auth/guards"
import { getExamPortionSettings } from "@/lib/exam-portion-settings"
import { formatExamPortionLabel, getEligibleExamPortions } from "@/lib/student-exams"
import { getJuzNumberForPortion, isValidExamPortionNumber, normalizeExamPortionType } from "@/lib/exam-portions"
import { getCompletedMemorizationDays } from "@/lib/plan-progress"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildExamAppNotificationMessage, fillExamWhatsAppTemplate, getExamWhatsAppTemplates } from "@/lib/whatsapp-notification-templates"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function isMissingExamSchedulesTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown }
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    (typeof candidate.message === "string" && candidate.message.includes("exam_schedules")) ||
    (typeof candidate.details === "string" && candidate.details.includes("exam_schedules"))
  )
}

function isMissingExamPortionColumns(error: unknown) {
  const message = getErrorMessage(error)
  return /portion_type|portion_number/i.test(message) && /column|does not exist|schema cache/i.test(message)
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

function getSaudiDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
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

async function getStudentActivePlanProgress(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const { data: plan, error: planError } = await supabase
    .from("student_plans")
    .select("direction, total_pages, total_days, daily_pages, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges, start_surah_number, start_verse, end_surah_number, end_verse, start_date")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (planError) {
    throw planError
  }

  if (!plan) {
    return null
  }

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level)")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (plan.start_date) {
    attendanceQuery = attendanceQuery.gte("date", plan.start_date)
  }

  const { data: attendanceRecords, error: attendanceError } = await attendanceQuery
  if (attendanceError) {
    throw attendanceError
  }

  const scheduledDates = plan.start_date
    ? getScheduledStudyDates(
      plan.start_date,
      Number(plan.total_days) > 0
        ? Number(plan.total_days)
        : (Number(plan.total_pages) > 0 && Number(plan.daily_pages) > 0 ? Math.max(0, Math.ceil(Number(plan.total_pages) / Number(plan.daily_pages))) : 0),
    )
    : []

  const passingRecords = (attendanceRecords || []).filter(hasCompletedMemorization)
  const completedDays = getCompletedMemorizationDays(passingRecords, scheduledDates.length)

  return { plan, completedDays }
}

function formatScheduledDate(dateValue: string) {
  const [year, month, day] = String(dateValue || "").split("-")
  if (!year || !month || !day) {
    return dateValue
  }

  return `${year}/${month}/${day}`
}

export async function GET(request: Request) {
  try {
    const session = await getRequestSession(request)
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
    }

    if (!isPrivilegedRole(session.role) && session.role !== "student" && session.role !== "teacher" && session.role !== "deputy_teacher") {
      return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
    }

    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    let studentId = String(searchParams.get("student_id") || "").trim()
    const circleName = String(searchParams.get("circle") || "").trim()
    const semesterId = String(searchParams.get("semester_id") || activeSemester.id).trim()

    if (session.role === "student") {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("account_number", Number(session.accountNumber))
        .maybeSingle()

      if (studentError) {
        throw studentError
      }

      if (!student?.id) {
        return NextResponse.json({ schedules: [], tableMissing: false }, { status: 200 })
      }

      studentId = String(student.id)
    } else if (studentId) {
      const studentAccess = await ensureStudentAccess(supabase, session, studentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }
    }

    const portionSettings = await getExamPortionSettings()

    let query = supabase
      .from("exam_schedules")
      .select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at, students(name)")
      .eq("semester_id", semesterId)
      .order("exam_date", { ascending: true })
      .order("created_at", { ascending: false })

    if ((session.role === "teacher" || session.role === "deputy_teacher") && !studentId) {
      const sessionHalaqah = String(session.halaqah || "").trim()

      if (circleName && circleName !== sessionHalaqah) {
        return NextResponse.json({ error: "لا يمكنك الوصول إلى مواعيد حلقة أخرى" }, { status: 403 })
      }

      query = query.eq("halaqah", sessionHalaqah)
    }

    if (circleName) {
      query = query.eq("halaqah", circleName)
    }

    if (studentId) {
      query = query.eq("student_id", studentId)
    }

    const { data, error } = await query
    if (error) {
      if (isMissingExamPortionColumns(error)) {
        return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
      }

      if (isMissingExamSchedulesTable(error)) {
        return NextResponse.json({ schedules: [], tableMissing: true }, { status: 200 })
      }
      throw error
    }

    return NextResponse.json({ schedules: data || [], tableMissing: false, portionSettings })
  } catch (error) {
    console.error("[exam-schedules][GET]", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ schedules: [], tableMissing: false, error: "لا يوجد فصل نشط حاليًا." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const portionSettings = await getExamPortionSettings()
    const body = await request.json()
    const studentId = String(body.student_id || "").trim()
    const portionType = normalizeExamPortionType(body.portion_type || portionSettings.mode)
    const portionNumber = Number(body.portion_number ?? body.juz_number)
    const examDate = String(body.exam_date || "").trim()
    const rawPortionLabel = String(body.exam_portion_label || "").trim()

    if (!studentId) {
      return NextResponse.json({ error: "الطالب مطلوب" }, { status: 400 })
    }

    if (!isValidExamPortionNumber(portionType, portionNumber)) {
      return NextResponse.json({ error: portionType === "hizb" ? "رقم الحزب غير صالح" : "رقم الجزء غير صالح" }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return NextResponse.json({ error: "تاريخ الاختبار غير صالح" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, halaqah, account_number, guardian_phone, completed_juzs, current_juzs, memorized_ranges, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student?.id || !student.halaqah) {
      return NextResponse.json({ error: "الطالب غير موجود أو غير مرتبط بحلقة" }, { status: 404 })
    }

    const activePlanProgress = await getStudentActivePlanProgress(supabase, student.id)
    const eligiblePortions = getEligibleExamPortions(student, activePlanProgress, portionType)
    if (eligiblePortions.length > 0 && !eligiblePortions.some((portion) => portion.portionType === portionType && portion.portionNumber === portionNumber)) {
      return NextResponse.json({ error: portionType === "hizb" ? "لا يمكن جدولة اختبار لحزب غير متاح حالياً لهذا الطالب" : "لا يمكن جدولة اختبار لجزء غير متاح حالياً لهذا الطالب" }, { status: 400 })
    }

    const { data: existingSchedule, error: existingScheduleError } = await supabase
      .from("exam_schedules")
      .select("id")
      .eq("student_id", student.id)
      .eq("semester_id", activeSemester.id)
      .eq("portion_type", portionType)
      .eq("portion_number", portionNumber)
      .eq("status", "scheduled")
      .maybeSingle()

    if (existingScheduleError) {
      if (isMissingExamPortionColumns(existingScheduleError)) {
        return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
      }

      if (isMissingExamSchedulesTable(existingScheduleError)) {
        return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
      }
      throw existingScheduleError
    }

    if (existingSchedule?.id) {
      return NextResponse.json({ error: portionType === "hizb" ? "يوجد موعد اختبار مجدول مسبقاً لهذا الحزب" : "يوجد موعد اختبار مجدول مسبقاً لهذا الجزء" }, { status: 400 })
    }

    const examPortionLabel = rawPortionLabel || formatExamPortionLabel(portionNumber, portionType === "hizb" ? `الحزب ${portionNumber}` : `الجزء ${portionNumber}`, portionType)
    const schedulePayload = {
      student_id: student.id,
      semester_id: activeSemester.id,
      halaqah: student.halaqah,
      exam_portion_label: examPortionLabel,
      portion_type: portionType,
      portion_number: portionNumber,
      juz_number: getJuzNumberForPortion(portionType, portionNumber),
      exam_date: examDate,
      status: "scheduled",
      notification_sent_at: new Date().toISOString(),
      scheduled_by_user_id: session.id,
      scheduled_by_name: session.name,
      scheduled_by_role: session.role,
      updated_at: new Date().toISOString(),
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from("exam_schedules")
      .insert(schedulePayload)
      .select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at")
      .single()

    if (scheduleError) {
      if (isMissingExamPortionColumns(scheduleError)) {
        return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
      }

      if (isMissingExamSchedulesTable(scheduleError)) {
        return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
      }
      throw scheduleError
    }

    const examWhatsAppTemplates = await getExamWhatsAppTemplates(supabase)
    const appMessage = buildExamAppNotificationMessage("create", {
      studentName: student.name || "الطالب",
      date: formatScheduledDate(examDate),
      portion: examPortionLabel,
      halaqah: student.halaqah,
    }, examWhatsAppTemplates)

    await insertNotificationsAndSendPush(supabase, [{
      user_account_number: String(student.account_number || ""),
      message: appMessage,
      url: "/exams",
      tag: `exam-schedule-${schedule.id}`,
    }])

    const whatsappMessage = fillExamWhatsAppTemplate(examWhatsAppTemplates.create, {
      studentName: student.name || "الطالب",
      date: formatScheduledDate(examDate),
      portion: examPortionLabel,
      halaqah: student.halaqah,
    })

    await enqueueWhatsAppMessage(supabase, {
      phoneNumber: student.guardian_phone,
      message: whatsappMessage,
      userId: session.id,
      dedupeDate: examDate,
    })

    return NextResponse.json({ success: true, schedule }, { status: 201 })
  } catch (error) {
    console.error("[exam-schedules][POST]", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل جدولة الاختبارات." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const body = await request.json()
    const scheduleId = String(body.id || "").trim()
    const portionSettings = await getExamPortionSettings()
    const portionType = normalizeExamPortionType(body.portion_type || portionSettings.mode)
    const portionNumber = Number(body.portion_number ?? body.juz_number)
    const examDate = String(body.exam_date || "").trim()
    const rawPortionLabel = String(body.exam_portion_label || "").trim()

    if (!scheduleId) {
      return NextResponse.json({ error: "معرف الموعد مطلوب" }, { status: 400 })
    }

    if (!isValidExamPortionNumber(portionType, portionNumber)) {
      return NextResponse.json({ error: portionType === "hizb" ? "رقم الحزب غير صالح" : "رقم الجزء غير صالح" }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return NextResponse.json({ error: "تاريخ الاختبار غير صالح" }, { status: 400 })
    }

    const { data: existingSchedule, error: existingScheduleError } = await supabase
      .from("exam_schedules")
      .select("id, student_id, halaqah, portion_type, portion_number, juz_number, exam_date, status")
      .eq("id", scheduleId)
      .maybeSingle()

    if (existingScheduleError) {
      if (isMissingExamPortionColumns(existingScheduleError)) {
        return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
      }

      if (isMissingExamSchedulesTable(existingScheduleError)) {
        return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
      }
      throw existingScheduleError
    }

    if (!existingSchedule?.id) {
      return NextResponse.json({ error: "موعد الاختبار غير موجود" }, { status: 404 })
    }

    if (existingSchedule.status !== "scheduled") {
      return NextResponse.json({ error: "لا يمكن تعديل موعد غير نشط" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, String(existingSchedule.student_id))
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, halaqah, account_number, guardian_phone, completed_juzs, current_juzs, memorized_ranges, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
      .eq("id", existingSchedule.student_id)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    const activePlanProgress = student?.id ? await getStudentActivePlanProgress(supabase, student.id) : null
    const eligiblePortions = getEligibleExamPortions(student || null, activePlanProgress, portionType)
    if (eligiblePortions.length > 0 && !eligiblePortions.some((portion) => portion.portionType === portionType && portion.portionNumber === portionNumber)) {
      return NextResponse.json({ error: portionType === "hizb" ? "لا يمكن تعديل الموعد إلى حزب غير متاح حالياً" : "لا يمكن تعديل الموعد إلى جزء غير متاح حالياً" }, { status: 400 })
    }

    const { data: duplicateSchedule, error: duplicateScheduleError } = await supabase
      .from("exam_schedules")
      .select("id")
      .eq("student_id", existingSchedule.student_id)
      .eq("portion_type", portionType)
      .eq("portion_number", portionNumber)
      .eq("status", "scheduled")
      .neq("id", scheduleId)
      .maybeSingle()

    if (duplicateScheduleError) {
      throw duplicateScheduleError
    }

    if (duplicateSchedule?.id) {
      return NextResponse.json({ error: portionType === "hizb" ? "يوجد موعد نشط آخر لهذا الحزب" : "يوجد موعد نشط آخر لهذا الجزء" }, { status: 400 })
    }

    const examPortionLabel = rawPortionLabel || formatExamPortionLabel(portionNumber, portionType === "hizb" ? `الحزب ${portionNumber}` : `الجزء ${portionNumber}`, portionType)

    const { data: schedule, error: scheduleError } = await supabase
      .from("exam_schedules")
      .update({
        portion_type: portionType,
        portion_number: portionNumber,
        juz_number: getJuzNumberForPortion(portionType, portionNumber),
        exam_portion_label: examPortionLabel,
        exam_date: examDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduleId)
      .select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at")
      .single()

    if (scheduleError) {
      throw scheduleError
    }

    const examWhatsAppTemplates = await getExamWhatsAppTemplates(supabase)
    const appMessage = buildExamAppNotificationMessage("update", {
      studentName: student?.name || "الطالب",
      date: formatScheduledDate(examDate),
      portion: examPortionLabel,
      halaqah: student?.halaqah,
    }, examWhatsAppTemplates)

    await insertNotificationsAndSendPush(supabase, [{
      user_account_number: String(student?.account_number || ""),
      message: appMessage,
      url: "/exams",
      tag: `exam-schedule-${schedule.id}`,
    }])

    const whatsappMessage = fillExamWhatsAppTemplate(examWhatsAppTemplates.update, {
      studentName: student?.name || "الطالب",
      date: formatScheduledDate(examDate),
      portion: examPortionLabel,
      halaqah: student?.halaqah,
    })

    await enqueueWhatsAppMessage(supabase, {
      phoneNumber: student?.guardian_phone,
      message: whatsappMessage,
      userId: session.id,
      dedupeDate: examDate,
    })

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error("[exam-schedules][PATCH]", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const scheduleId = String(searchParams.get("id") || "").trim()

    if (!scheduleId) {
      return NextResponse.json({ error: "معرف الموعد مطلوب" }, { status: 400 })
    }

    const { data: existingSchedule, error: existingScheduleError } = await supabase
      .from("exam_schedules")
      .select("id, student_id, portion_type, portion_number, juz_number, exam_date, status")
      .eq("id", scheduleId)
      .maybeSingle()

    if (existingScheduleError) {
      if (isMissingExamSchedulesTable(existingScheduleError)) {
        return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
      }
      throw existingScheduleError
    }

    if (!existingSchedule?.id) {
      return NextResponse.json({ error: "موعد الاختبار غير موجود" }, { status: 404 })
    }

    if (existingSchedule.status !== "scheduled") {
      return NextResponse.json({ error: "هذا الموعد غير قابل للإلغاء" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, String(existingSchedule.student_id))
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("name, halaqah, account_number, guardian_phone")
      .eq("id", existingSchedule.student_id)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    const { error: cancelError } = await supabase
      .from("exam_schedules")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduleId)

    if (cancelError) {
      throw cancelError
    }

    const existingPortionType = normalizeExamPortionType(existingSchedule.portion_type)
    const existingPortionNumber = Number(existingSchedule.portion_number || existingSchedule.juz_number)
    const examWhatsAppTemplates = await getExamWhatsAppTemplates(supabase)
    const appMessage = buildExamAppNotificationMessage("cancel", {
      studentName: student?.name || "الطالب",
      date: formatScheduledDate(existingSchedule.exam_date),
      portion: formatExamPortionLabel(existingPortionNumber, existingPortionType === "hizb" ? `الحزب ${existingPortionNumber}` : `الجزء ${existingPortionNumber}`, existingPortionType),
      halaqah: student?.halaqah,
    }, examWhatsAppTemplates)

    await insertNotificationsAndSendPush(supabase, [{
      user_account_number: String(student?.account_number || ""),
      message: appMessage,
      url: "/exams",
      tag: `exam-schedule-${scheduleId}`,
    }])

    const whatsappMessage = fillExamWhatsAppTemplate(examWhatsAppTemplates.cancel, {
      studentName: student?.name || "الطالب",
      date: formatScheduledDate(existingSchedule.exam_date),
      portion: formatExamPortionLabel(existingPortionNumber, existingPortionType === "hizb" ? `الحزب ${existingPortionNumber}` : `الجزء ${existingPortionNumber}`, existingPortionType),
      halaqah: student?.halaqah,
    })

    await enqueueWhatsAppMessage(supabase, {
      phoneNumber: student?.guardian_phone,
      message: whatsappMessage,
      userId: session.id,
      dedupeDate: existingSchedule.exam_date,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[exam-schedules][DELETE]", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}