import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import {
  buildRecitationDayStudentsSnapshot,
  hydrateArchivedRecitationStudent,
  normalizeRecitationDayPortions,
  shouldIncludeArchivedRecitationStudent,
} from "@/lib/recitation-days"
import { getSiteSetting } from "@/lib/site-settings"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"
import { isWhatsAppWorkerReady, readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"
import {
  DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES,
  fillRecitationDayLifecycleTemplate,
  normalizeRecitationDayLifecycleNotificationTemplates,
  RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID,
} from "@/lib/recitation-day-lifecycle-notification-templates"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

type LifecycleRecipient = {
  student_id: string
  student_name: string
  account_number?: number | null
  halaqah?: string | null
  guardian_phone?: string | null
}

type RecitationSupabase = ReturnType<typeof createAdminClient>

function normalizeHalaqahScope(value: unknown) {
  const normalizedValue = String(value || "").trim()
  return normalizedValue && normalizedValue !== "all" ? normalizedValue : null
}

async function sendLifecycleNotifications(params: {
  supabase: RecitationSupabase
  phase: "start" | "end"
  recipients: LifecycleRecipient[]
  sessionUserId: string
  date: string
}) {
  const whatsappStatus = await readWhatsAppWorkerStatus()
  const shouldQueueWhatsApp = isWhatsAppWorkerReady(whatsappStatus)

  const templates = normalizeRecitationDayLifecycleNotificationTemplates(
    await getSiteSetting(
      RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID,
      DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES,
    ),
  )

  const phaseTemplates = templates[params.phase]
  const notificationRows = params.recipients
    .filter((recipient) => recipient.account_number)
    .map((recipient) => ({
      user_account_number: String(recipient.account_number),
      message: fillRecitationDayLifecycleTemplate(phaseTemplates.app, {
        studentName: recipient.student_name || "الطالب",
        halaqah: recipient.halaqah,
        date: params.date,
      }),
    }))

  if (notificationRows.length > 0) {
    try {
      await insertNotificationsAndSendPush(params.supabase, notificationRows.map((notification) => ({
        ...notification,
        url: "/notifications",
        tag: `recitation-day-${params.phase}-${params.date}`,
      })))
    } catch (error) {
      console.error(`[recitation-days][${params.phase}] failed to insert app notifications`, error)
    }
  }

  if (!shouldQueueWhatsApp) {
    console.info(`[recitation-days][${params.phase}] skipped WhatsApp lifecycle notifications because WhatsApp is not ready`)
    return
  }

  for (const recipient of params.recipients) {
    try {
      await enqueueWhatsAppMessage(params.supabase, {
        phoneNumber: recipient.guardian_phone,
        message: fillRecitationDayLifecycleTemplate(phaseTemplates.whatsapp, {
          studentName: recipient.student_name || "الطالب",
          halaqah: recipient.halaqah,
          date: params.date,
        }),
        userId: params.sessionUserId,
        dedupeDate: params.date,
      })
    } catch (error) {
      console.error(`[recitation-days][${params.phase}] failed to enqueue WhatsApp notification`, error)
    }
  }
}

function formatRecitationDateRange(startDate: string, endDate?: string | null) {
  const normalizedStartDate = String(startDate || "").trim()
  const normalizedEndDate = String(endDate || "").trim() || normalizedStartDate

  if (!normalizedStartDate) {
    return ""
  }

  return normalizedStartDate === normalizedEndDate
    ? normalizedStartDate
    : `من ${normalizedStartDate} إلى ${normalizedEndDate}`
}

async function loadDayDetails(supabase: RecitationSupabase, dayId: string) {
  const { data: day, error: dayError } = await supabase
    .from("recitation_days")
    .select("*")
    .eq("id", dayId)
    .maybeSingle()

  if (dayError) {
    throw dayError
  }

  if (!day) {
    return null
  }

  const { data: students, error: studentsError } = await supabase
    .from("recitation_day_students")
    .select("*")
    .eq("recitation_day_id", dayId)
    .order("student_name", { ascending: true })

  if (studentsError) {
    throw studentsError
  }

  const studentIds = (students || []).map((student) => student.id)
  const portionsByStudentId = new Map<string, any[]>()

  if (studentIds.length > 0) {
    const { data: portions, error: portionsError } = await supabase
      .from("recitation_day_portions")
      .select("*")
      .in("recitation_day_student_id", studentIds)
      .order("sort_order", { ascending: true })

    if (portionsError) {
      throw portionsError
    }

    const normalizedPortions = await normalizeRecitationDayPortions(supabase, students || [], portions || [])

    for (const portion of normalizedPortions) {
      const current = portionsByStudentId.get(portion.recitation_day_student_id) || []
      current.push(portion)
      portionsByStudentId.set(portion.recitation_day_student_id, current)
    }
  }

  const enrichedStudents = (students || []).map((student) => hydrateArchivedRecitationStudent({
    ...student,
    portions: portionsByStudentId.get(student.id) || [],
  }))

  const archiveReadyStudents = day.status === "archived"
    ? enrichedStudents.filter((student) => shouldIncludeArchivedRecitationStudent(student))
    : enrichedStudents

  return {
    day,
    students: archiveReadyStudents,
    halaqahOptions: Array.from(new Set(archiveReadyStudents.map((student) => String(student.halaqah || "").trim()).filter(Boolean))).sort(),
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get("mode") || "current"

    if (mode === "archive") {
      const { data, error } = await supabase
        .from("recitation_days")
        .select("id, recitation_date, recitation_end_date, halaqah, status, archived_at, archived_by_name, created_at")
        .eq("status", "archived")
        .order("recitation_date", { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json({ archiveDays: data || [] })
    }

    const { data: openDay, error } = await supabase
      .from("recitation_days")
      .select("id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!openDay) {
      return NextResponse.json({ currentDay: null, students: [], halaqahOptions: [] })
    }

    const details = await loadDayDetails(supabase, openDay.id)
    return NextResponse.json({
      currentDay: details?.day || null,
      students: details?.students || [],
      halaqahOptions: details?.halaqahOptions || [],
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const body = await request.json()
    const recitationStartDate = String(body.recitationStartDate || body.recitationDate || "").trim()
    const recitationEndDate = String(body.recitationEndDate || body.recitationDate || "").trim() || recitationStartDate
    const targetHalaqah = normalizeHalaqahScope(body.halaqah)

    if (!recitationStartDate || !recitationEndDate) {
      return NextResponse.json({ error: "حدد تاريخ يوم السرد أولاً" }, { status: 400 })
    }

    if (recitationEndDate < recitationStartDate) {
      return NextResponse.json({ error: "تاريخ النهاية يجب أن يكون مساويًا أو بعد تاريخ البداية" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: existingOpenDay } = await supabase
      .from("recitation_days")
      .select("id")
      .eq("status", "open")
      .limit(1)
      .maybeSingle()

    if (existingOpenDay) {
      return NextResponse.json({ error: "يوجد يوم سرد مفتوح بالفعل. يجب إنهاؤه أولاً" }, { status: 409 })
    }

    const snapshots = await buildRecitationDayStudentsSnapshot(supabase, { halaqah: targetHalaqah })

    if (snapshots.length === 0) {
      return NextResponse.json({ error: targetHalaqah ? "لا يوجد طلاب في الحلقة المحددة" : "لا يوجد طلاب لبدء يوم السرد" }, { status: 400 })
    }

    const studentIds = snapshots.map((student) => student.student_id)
    const { data: studentContacts, error: studentContactsError } = studentIds.length > 0
      ? await supabase.from("students").select("id, guardian_phone").in("id", studentIds)
      : { data: [], error: null }

    if (studentContactsError) {
      throw studentContactsError
    }

    const guardianPhoneByStudentId = new Map((studentContacts || []).map((student) => [String(student.id), student.guardian_phone || null]))

    const { data: createdDay, error: dayError } = await supabase
      .from("recitation_days")
      .insert({
        recitation_date: recitationStartDate,
        recitation_end_date: recitationEndDate,
        halaqah: null,
        status: "open",
        created_by: session.id,
        created_by_name: session.name,
      })
      .select("id")
      .single()

    if (dayError) {
      throw dayError
    }

    const studentRows = snapshots.map((student) => ({
      recitation_day_id: createdDay.id,
      student_id: student.student_id,
      student_name: student.student_name,
      account_number: student.account_number,
      halaqah: student.halaqah,
      teacher_name: student.teacher_name,
      full_memorized_text: student.full_memorized_text,
      scattered_parts_text: student.scattered_parts_text,
      overall_status: student.overall_status,
      evaluator_name: student.evaluator_name,
      heard_amount_text: student.heard_amount_text,
      grade: student.grade,
      errors_count: student.errors_count,
      alerts_count: student.alerts_count,
      notes: student.notes,
    }))

    const { data: insertedStudents, error: studentsError } = await supabase
      .from("recitation_day_students")
      .insert(studentRows)
      .select("id, student_id")

    if (studentsError) {
      throw studentsError
    }

    const studentIdMap = new Map<string, string>()
    for (const student of insertedStudents || []) {
      if (student.student_id) {
        studentIdMap.set(String(student.student_id), student.id)
      }
    }

    const portionRows = snapshots.flatMap((student) => {
      const recitationDayStudentId = studentIdMap.get(student.student_id)
      if (!recitationDayStudentId) {
        return []
      }

      return student.portions.map((portion) => ({
        recitation_day_student_id: recitationDayStudentId,
        sort_order: portion.sort_order,
        portion_type: portion.portion_type,
        label: portion.label,
        from_surah: portion.from_surah,
        from_verse: portion.from_verse,
        to_surah: portion.to_surah,
        to_verse: portion.to_verse,
      }))
    })

    if (portionRows.length > 0) {
      const { error: portionsError } = await supabase.from("recitation_day_portions").insert(portionRows)
      if (portionsError) {
        throw portionsError
      }
    }

    await sendLifecycleNotifications({
      supabase,
      phase: "start",
      recipients: snapshots.map((student) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        account_number: student.account_number,
        halaqah: student.halaqah,
        guardian_phone: guardianPhoneByStudentId.get(student.student_id) || null,
      })),
      sessionUserId: session.id,
      date: formatRecitationDateRange(recitationStartDate, recitationEndDate),
    })

    const details = await loadDayDetails(supabase, createdDay.id)
    return NextResponse.json({
      currentDay: details?.day || null,
      students: details?.students || [],
      halaqahOptions: details?.halaqahOptions || [],
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const targetHalaqah = normalizeHalaqahScope(body?.halaqah)
    const supabase = createAdminClient()
    const { data: openDay, error } = await supabase
      .from("recitation_days")
      .select("id, recitation_date, recitation_end_date")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!openDay) {
      return NextResponse.json({ error: "لا يوجد يوم سرد مفتوح" }, { status: 404 })
    }

    const { data: allOpenStudents, error: allOpenStudentsError } = await supabase
      .from("recitation_day_students")
      .select("id, student_id, student_name, account_number, halaqah")
      .eq("recitation_day_id", openDay.id)

    if (allOpenStudentsError) {
      throw allOpenStudentsError
    }

    if (!allOpenStudents || allOpenStudents.length === 0) {
      return NextResponse.json({ error: "لا يوجد طلاب داخل يوم السرد الحالي" }, { status: 400 })
    }

    let recipientsQuery = supabase
      .from("recitation_day_students")
      .select("id, student_id, student_name, account_number, halaqah")
      .eq("recitation_day_id", openDay.id)

    if (targetHalaqah) {
      recipientsQuery = recipientsQuery.eq("halaqah", targetHalaqah)
    }

    const { data: recipientStudents, error: recipientStudentsError } = await recipientsQuery

    if (recipientStudentsError) {
      throw recipientStudentsError
    }

    if (!recipientStudents || recipientStudents.length === 0) {
      return NextResponse.json({ error: targetHalaqah ? "لا يوجد طلاب في الحلقة المحددة داخل يوم السرد الحالي" : "لا يوجد طلاب لإرسال إشعار الإنهاء" }, { status: 400 })
    }

    const recipientStudentIds = recipientStudents.map((student) => String(student.student_id || "").trim()).filter(Boolean)
    const { data: recipientContacts, error: recipientContactsError } = recipientStudentIds.length > 0
      ? await supabase.from("students").select("id, guardian_phone").in("id", recipientStudentIds)
      : { data: [], error: null }

    if (recipientContactsError) {
      throw recipientContactsError
    }

    const guardianPhoneByStudentId = new Map((recipientContacts || []).map((student) => [String(student.id), student.guardian_phone || null]))

    const archiveTimestamp = new Date().toISOString()
    const recipientsByHalaqah = recipientStudents.reduce<Map<string, typeof recipientStudents>>((groups, student) => {
      const halaqahKey = String(student.halaqah || "").trim() || "__no_halaqah__"
      const currentGroup = groups.get(halaqahKey) || []
      currentGroup.push(student)
      groups.set(halaqahKey, currentGroup)
      return groups
    }, new Map())

    for (const [halaqahKey, studentsGroup] of recipientsByHalaqah.entries()) {
      const halaqahName = halaqahKey === "__no_halaqah__" ? null : halaqahKey
      const { data: archivedDay, error: archivedDayError } = await supabase
        .from("recitation_days")
        .insert({
          recitation_date: openDay.recitation_date,
          recitation_end_date: openDay.recitation_end_date || openDay.recitation_date,
          halaqah: halaqahName,
          status: "archived",
          created_by: auth.session.id,
          created_by_name: auth.session.name,
          archived_by: auth.session.id,
          archived_by_name: auth.session.name,
          archived_at: archiveTimestamp,
          updated_at: archiveTimestamp,
        })
        .select("id")
        .single()

      if (archivedDayError || !archivedDay) {
        throw archivedDayError || new Error("تعذر إنشاء أرشيف الحلقة المحددة")
      }

      const selectedRowIds = studentsGroup.map((student) => student.id)
      const { error: moveStudentsError } = await supabase
        .from("recitation_day_students")
        .update({
          recitation_day_id: archivedDay.id,
          updated_at: archiveTimestamp,
        })
        .in("id", selectedRowIds)

      if (moveStudentsError) {
        throw moveStudentsError
      }
    }

    const { count: remainingStudentsCount, error: remainingStudentsError } = await supabase
      .from("recitation_day_students")
      .select("id", { count: "exact", head: true })
      .eq("recitation_day_id", openDay.id)

    if (remainingStudentsError) {
      throw remainingStudentsError
    }

    if ((remainingStudentsCount || 0) === 0) {
      const { error: deleteOpenDayError } = await supabase
        .from("recitation_days")
        .delete()
        .eq("id", openDay.id)

      if (deleteOpenDayError) {
        throw deleteOpenDayError
      }
    }

    await sendLifecycleNotifications({
      supabase,
      phase: "end",
      recipients: recipientStudents.map((student) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        account_number: student.account_number,
        halaqah: student.halaqah,
        guardian_phone: guardianPhoneByStudentId.get(String(student.student_id)) || null,
      })),
      sessionUserId: auth.session.id,
      date: formatRecitationDateRange(openDay.recitation_date, openDay.recitation_end_date),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}