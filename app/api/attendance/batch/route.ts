import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAbsenceNotificationTemplates, syncAbsenceNotification } from "@/lib/absence-notifications"
import {
  buildHafizAmountLabel,
  loadAttendanceSaveGuardianTemplates,
  sendAttendanceSaveGuardianNotification,
} from "@/lib/attendance-save-notifications"
import { ensureTeacherScope, isTeacherRole, requireRoles } from "@/lib/auth/guards"
import { isWhatsAppWorkerReady, readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"
import {
  applyAttendancePointsAdjustment,
  calculateTotalEvaluationPoints,
  isEvaluatedAttendance,
  isNonEvaluatedAttendance,
} from "@/lib/student-attendance"
import { getOrCreateActiveSemester, isNoActiveSemesterError } from "@/lib/semesters"
import { getHafizExtraPoints, normalizeHafizExtraPages } from "@/lib/hafiz-extra"

function getKsaDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function hasCompleteEvaluation(levels: {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}) {
  return !!(
    levels.hafiz_level &&
    levels.tikrar_level &&
    levels.samaa_level &&
    levels.rabet_level
  )
}

function normalizeHalaqah(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

function isMissingStudentHafizExtrasTable(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /student_hafiz_extras/i.test(message) && /does not exist|not exist|relation|table/i.test(message)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const body = await request.json()
    const { students, teacher_id, halaqah, debug_today } = body
    console.log("[DEBUG][API] students received:", students)
    if (!Array.isArray(students) || !teacher_id || !halaqah) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, halaqah, teacher_id)
    if (teacherScopeError) {
      return teacherScopeError
    }

    for (const student of students) {
      const status = student.attendance || "present"
      if (
        isEvaluatedAttendance(status) &&
        !hasCompleteEvaluation({
          hafiz_level: student.evaluation?.hafiz,
          tikrar_level: student.evaluation?.tikrar,
          samaa_level: student.evaluation?.samaa,
          rabet_level: student.evaluation?.rabet,
        })
      ) {
        return NextResponse.json(
          { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر أو المتأخر قبل الحفظ", student_id: student.id },
          { status: 400 },
        )
      }
    }

    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const absenceTemplates = await getAbsenceNotificationTemplates(supabase)
    const attendanceTemplates = await loadAttendanceSaveGuardianTemplates()
    const todayDate = getKsaDateString()
    const effectiveTeacherId = isTeacherRole(session.role) ? session.id : teacher_id
    const hasAnyHafizExtra = students.some((student) => normalizeHafizExtraPages(student?.hafizExtraPages) !== null)

    if (hasAnyHafizExtra) {
      const { error: hafizExtrasTableError } = await supabase
        .from("student_hafiz_extras")
        .select("attendance_record_id")
        .limit(1)

      if (hafizExtrasTableError && isMissingStudentHafizExtrasTable(hafizExtrasTableError)) {
        return NextResponse.json(
          { error: "جدول زيادة الحفظ غير موجود بعد. نفذ ملف 047_create_student_hafiz_extras.sql ثم أعد المحاولة." },
          { status: 503 },
        )
      }

      if (hafizExtrasTableError) {
        return NextResponse.json({ error: "تعذر التحقق من جدول زيادة الحفظ" }, { status: 500 })
      }
    }

    const requestedStudentIds = students
      .map((student) => String(student?.id || "").trim())
      .filter(Boolean)

    const { data: studentRows, error: studentsError } = await supabase
      .from("students")
      .select("id, name, halaqah, guardian_phone, points, store_points")
      .in("id", requestedStudentIds)

    if (studentsError) {
      return NextResponse.json({ error: "تعذر تحميل بيانات الطلاب قبل الحفظ" }, { status: 500 })
    }

    const studentRowsById = new Map((studentRows || []).map((student) => [String(student.id), student]))

    for (const studentId of requestedStudentIds) {
      const studentRow = studentRowsById.get(studentId)

      if (!studentRow) {
        return NextResponse.json({ error: "الطالب غير موجود", student_id: studentId }, { status: 404 })
      }

      if (
        isTeacherRole(session.role) &&
        normalizeHalaqah(studentRow.halaqah) !== normalizeHalaqah(session.halaqah)
      ) {
        return NextResponse.json({ error: "الطالب لا يتبع حلقتك", student_id: studentId }, { status: 403 })
      }
    }

    const studentPointsState = new Map(
      (studentRows || []).map((student) => [
        String(student.id),
        {
          points: Number(student.points) || 0,
          store_points: Number(student.store_points) || 0,
        },
      ]),
    )

    const whatsappStatus = await readWhatsAppWorkerStatus()
    const whatsappReady = isWhatsAppWorkerReady(whatsappStatus)
    const whatsappSummary = {
      ready: whatsappReady,
      status: whatsappStatus.status,
      queuedCount: 0,
      skippedCount: 0,
      skippedReasons: {
        duplicate: 0,
        missingGuardianPhone: 0,
        invalidPhone: 0,
        missingData: 0,
        other: 0,
      },
    }
    const results = []
    for (const student of students) {
      const { id: student_id, attendance, evaluation, readingDetails, notes } = student
      const studentRow = studentRowsById.get(String(student_id))
      const pointState = studentPointsState.get(String(student_id))

      if (!studentRow || !pointState) {
        return NextResponse.json({ error: "تعذر تحديد بيانات الطالب أثناء الحفظ", student_id }, { status: 500 })
      }

      const status = attendance || "present"
      const isAbsent = isNonEvaluatedAttendance(status)
      const hafiz_level = isAbsent ? "not_completed" : (evaluation?.hafiz || "not_completed")
      const tikrar_level = isAbsent ? "not_completed" : (evaluation?.tikrar || "not_completed")
      const samaa_level = isAbsent ? "not_completed" : (evaluation?.samaa || "not_completed")
      const rabet_level = isAbsent ? "not_completed" : (evaluation?.rabet || "not_completed")
      const hafizExtraPages = isAbsent ? null : normalizeHafizExtraPages(student?.hafizExtraPages)
      const hafizExtraPoints = getHafizExtraPoints(hafizExtraPages)
      const normalizedNotes = typeof notes === "string" && notes.trim() ? notes.trim() : null

      console.log(`[DEBUG][API] الطالب: ${student_id}, الحضور: ${status}, التقييمات المدخلة:`, evaluation)
      console.log(`[DEBUG][API] القيم التي سيتم حفظها: hafiz=${hafiz_level}, tikrar=${tikrar_level}, samaa=${samaa_level}, rabet=${rabet_level}`)
      // تحقق من وجود سجل حضور لهذا اليوم
      const { data: existingRecords, error: existingRecordsError } = await supabase
        .from("attendance_records")
          .select("id, status, is_compensation, created_at")
        .eq("student_id", student_id)
        .eq("date", todayDate)
        .order("created_at", { ascending: true })

      if (existingRecordsError) {
        return NextResponse.json(
          { error: "فشل في التحقق من سجل الحضور الحالي", student_id },
          { status: 500 },
        )
      }

      const existingRecord = (existingRecords || []).find((record) => !record.is_compensation) || null
      let attendanceRecord
      let oldPoints = 0
      let oldHafizExtraPoints = 0
      const previousStatus = existingRecord?.status ?? null

      if (existingRecord) {
        // نحسب صافي النقاط مرة واحدة لتجنب جلب رصيد الطالب أكثر من مرة.
        const { data: oldEvaluations, error: oldEvaluationError } = await supabase
          .from("evaluations")
          .select("hafiz_level, tikrar_level, samaa_level, rabet_level, created_at")
          .eq("attendance_record_id", existingRecord.id)
          .order("created_at", { ascending: true })

        if (oldEvaluationError) {
          return NextResponse.json(
            { error: "فشل في قراءة تقييم الطالب السابق", student_id },
            { status: 500 },
          )
        }

        const oldEvaluation = Array.isArray(oldEvaluations)
          ? oldEvaluations[oldEvaluations.length - 1]
          : null

        if (oldEvaluation) {
          oldPoints = applyAttendancePointsAdjustment(
            calculateTotalEvaluationPoints({
              hafiz_level: oldEvaluation.hafiz_level,
              tikrar_level: oldEvaluation.tikrar_level,
              samaa_level: oldEvaluation.samaa_level,
              rabet_level: oldEvaluation.rabet_level,
            }),
            existingRecord?.status,
          )
          await supabase.from("evaluations").delete().eq("attendance_record_id", existingRecord.id)
        }

        const { data: oldHafizExtraRows, error: oldHafizExtraError } = await supabase
          .from("student_hafiz_extras")
          .select("points_awarded")
          .eq("attendance_record_id", existingRecord.id)

        if (oldHafizExtraError && !isMissingStudentHafizExtrasTable(oldHafizExtraError)) {
          return NextResponse.json(
            { error: "فشل في قراءة زيادة الحفظ السابقة", student_id },
            { status: 500 },
          )
        }

        oldHafizExtraPoints = Array.isArray(oldHafizExtraRows)
          ? oldHafizExtraRows.reduce((sum, row) => sum + (Number(row.points_awarded) || 0), 0)
          : 0

        await supabase
          .from("attendance_records")
          .update({ teacher_id: effectiveTeacherId, halaqah, status, notes: normalizedNotes })
          .eq("id", existingRecord.id)
        attendanceRecord = existingRecord
      } else {
        const { data: newRecord, error: attendanceInsertError } = await supabase
          .from("attendance_records")
          .insert({ student_id, teacher_id: effectiveTeacherId, halaqah, status, date: todayDate, semester_id: activeSemester.id, notes: normalizedNotes })
          .select()
          .single()

        if (attendanceInsertError) {
          const isLateConstraintFailure =
            status === "late" &&
            /status|check|constraint|invalid input value/i.test(
              `${attendanceInsertError.message ?? ""} ${attendanceInsertError.details ?? ""} ${attendanceInsertError.hint ?? ""}`,
            )

          return NextResponse.json(
            {
              error: isLateConstraintFailure
                ? "قاعدة البيانات لا تسمح بعد بحالة متأخر في سجل الحضور. نفذ ملف scripts/042_allow_late_attendance_records.sql ثم أعد المحاولة."
                : attendanceInsertError.message || "Failed to create attendance record",
              student_id,
              details: attendanceInsertError.details ?? null,
              hint: attendanceInsertError.hint ?? null,
              code: attendanceInsertError.code ?? null,
            },
            { status: 500 },
          )
        }
        attendanceRecord = newRecord
      }

      await syncAbsenceNotification({
        supabase,
        studentId: student_id,
        date: todayDate,
        previousStatus,
        nextStatus: status,
        templates: absenceTemplates,
        skipWhatsApp: true,
      })

      // إضافة التقييم الجديد وحساب النقاط فقط إذا لم يكن غائب أو مستأذن
      if (isEvaluatedAttendance(status)) {
        const totalPoints = applyAttendancePointsAdjustment(
          calculateTotalEvaluationPoints({
            hafiz_level,
            tikrar_level,
            samaa_level,
            rabet_level,
          }),
          status,
        )
        const { data: evaluationResult, error: evaluationError } = await supabase
          .from("evaluations")
          .insert({
            attendance_record_id: attendanceRecord.id,
            hafiz_level,
            tikrar_level,
            samaa_level,
            rabet_level,
            hafiz_from_surah: readingDetails?.hafiz?.fromSurah?.trim() || null,
            hafiz_from_verse: readingDetails?.hafiz?.fromVerse?.trim() || null,
            hafiz_to_surah: readingDetails?.hafiz?.toSurah?.trim() || null,
            hafiz_to_verse: readingDetails?.hafiz?.toVerse?.trim() || null,
            samaa_from_surah: readingDetails?.samaa?.fromSurah?.trim() || null,
            samaa_from_verse: readingDetails?.samaa?.fromVerse?.trim() || null,
            samaa_to_surah: readingDetails?.samaa?.toSurah?.trim() || null,
            samaa_to_verse: readingDetails?.samaa?.toVerse?.trim() || null,
            rabet_from_surah: readingDetails?.rabet?.fromSurah?.trim() || null,
            rabet_from_verse: readingDetails?.rabet?.fromVerse?.trim() || null,
            rabet_to_surah: readingDetails?.rabet?.toSurah?.trim() || null,
            rabet_to_verse: readingDetails?.rabet?.toVerse?.trim() || null,
          })
          .select()
          .single()

        if (evaluationError) {
          if (!existingRecord) {
            await supabase.from("attendance_records").delete().eq("id", attendanceRecord.id)
          }
          return NextResponse.json(
            { error: "فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور", student_id },
            { status: 500 },
          )
        }

        console.log(`[DEBUG][API] التقييم المخزن في قاعدة البيانات:`, evaluationResult)
        if (hafizExtraPages !== null) {
          const { error: hafizExtraUpsertError } = await supabase
            .from("student_hafiz_extras")
            .upsert({
              attendance_record_id: attendanceRecord.id,
              student_id,
              semester_id: activeSemester.id,
              attendance_date: todayDate,
              extra_pages: hafizExtraPages,
              points_awarded: hafizExtraPoints,
              created_by: effectiveTeacherId,
            }, { onConflict: "attendance_record_id" })

          if (hafizExtraUpsertError) {
            return NextResponse.json(
              {
                error: isMissingStudentHafizExtrasTable(hafizExtraUpsertError)
                  ? "جدول زيادة الحفظ غير موجود بعد. نفذ ملف 047_create_student_hafiz_extras.sql ثم أعد المحاولة."
                  : "فشل في حفظ زيادة الحفظ",
                student_id,
              },
              { status: isMissingStudentHafizExtrasTable(hafizExtraUpsertError) ? 503 : 500 },
            )
          }
        } else if (existingRecord) {
          const { error: deleteHafizExtraError } = await supabase
            .from("student_hafiz_extras")
            .delete()
            .eq("attendance_record_id", attendanceRecord.id)

          if (deleteHafizExtraError && !isMissingStudentHafizExtrasTable(deleteHafizExtraError)) {
            return NextResponse.json(
              { error: "فشل في حذف زيادة الحفظ السابقة", student_id },
              { status: 500 },
            )
          }
        }

        const netPointsChange = (totalPoints + hafizExtraPoints) - (oldPoints + oldHafizExtraPoints)

        if (netPointsChange !== 0) {
          const newPoints = Math.max(0, pointState.points + netPointsChange)
          const newStorePoints = Math.max(0, pointState.store_points + netPointsChange)

          await supabase
            .from("students")
            .update({ points: newPoints, store_points: newStorePoints })
            .eq("id", student_id)

          studentPointsState.set(String(student_id), {
            points: newPoints,
            store_points: newStorePoints,
          })
        }

        const whatsappResult = await sendAttendanceSaveGuardianNotification({
          supabase,
          studentId: student_id,
          date: todayDate,
          status,
          performedByUserId: effectiveTeacherId,
          templates: attendanceTemplates,
          studentData: studentRow,
          evaluation: {
            hafiz: hafiz_level,
            tikrar: tikrar_level,
            samaa: samaa_level,
            rabet: rabet_level,
          },
          hafizAmount: buildHafizAmountLabel({
            fromSurah: readingDetails?.hafiz?.fromSurah,
            fromVerse: readingDetails?.hafiz?.fromVerse,
            toSurah: readingDetails?.hafiz?.toSurah,
            toVerse: readingDetails?.hafiz?.toVerse,
          }),
        })
        if (whatsappResult.queued) {
          whatsappSummary.queuedCount += 1
        } else {
          whatsappSummary.skippedCount += 1
          if (whatsappResult.reason === "duplicate") whatsappSummary.skippedReasons.duplicate += 1
          else if (whatsappResult.reason === "missing-guardian-phone") whatsappSummary.skippedReasons.missingGuardianPhone += 1
          else if (whatsappResult.reason === "invalid-phone") whatsappSummary.skippedReasons.invalidPhone += 1
          else if (whatsappResult.reason === "missing-data") whatsappSummary.skippedReasons.missingData += 1
          else whatsappSummary.skippedReasons.other += 1
        }
        results.push({ student_id, success: true, pointsAdded: totalPoints + hafizExtraPoints })
      } else {
        // إذا كان غائب أو مستأذن لا يتم إضافة تقييمات ولا نقاط، ويتم حذف أي تقييمات قديمة
        await supabase.from("evaluations").delete().eq("attendance_record_id", attendanceRecord.id)

        if (existingRecord) {
          const { error: deleteHafizExtraError } = await supabase
            .from("student_hafiz_extras")
            .delete()
            .eq("attendance_record_id", attendanceRecord.id)

          if (deleteHafizExtraError && !isMissingStudentHafizExtrasTable(deleteHafizExtraError)) {
            return NextResponse.json(
              { error: "فشل في حذف زيادة الحفظ السابقة", student_id },
              { status: 500 },
            )
          }
        }

        if (oldPoints > 0 || oldHafizExtraPoints > 0) {
          const newPoints = Math.max(0, pointState.points - oldPoints - oldHafizExtraPoints)
          const newStorePoints = Math.max(0, pointState.store_points - oldPoints - oldHafizExtraPoints)

          await supabase
            .from("students")
            .update({ points: newPoints, store_points: newStorePoints })
            .eq("id", student_id)

          studentPointsState.set(String(student_id), {
            points: newPoints,
            store_points: newStorePoints,
          })
        }

        const whatsappResult = await sendAttendanceSaveGuardianNotification({
          supabase,
          studentId: student_id,
          date: todayDate,
          status,
          performedByUserId: effectiveTeacherId,
          templates: attendanceTemplates,
          studentData: studentRow,
        })
        if (whatsappResult.queued) {
          whatsappSummary.queuedCount += 1
        } else {
          whatsappSummary.skippedCount += 1
          if (whatsappResult.reason === "duplicate") whatsappSummary.skippedReasons.duplicate += 1
          else if (whatsappResult.reason === "missing-guardian-phone") whatsappSummary.skippedReasons.missingGuardianPhone += 1
          else if (whatsappResult.reason === "invalid-phone") whatsappSummary.skippedReasons.invalidPhone += 1
          else if (whatsappResult.reason === "missing-data") whatsappSummary.skippedReasons.missingData += 1
          else whatsappSummary.skippedReasons.other += 1
        }
        results.push({ student_id, success: true, pointsAdded: 0 })
      }
    }
    return NextResponse.json({ success: true, results, whatsapp: whatsappSummary })
  } catch (error) {
    console.error("[batch] Error in batch attendance API:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل حفظ الحضور الجماعي." }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
