import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureStudentAccess, ensureTeacherScope, isTeacherRole, requireRoles } from "@/lib/auth/guards"
import { getAbsenceNotificationTemplates, syncAbsenceNotification } from "@/lib/absence-notifications"
import { buildHafizAmountLabel, sendAttendanceSaveGuardianNotification } from "@/lib/attendance-save-notifications"
import {
  applyAttendancePointsAdjustment,
  calculateEvaluationLevelPoints,
  calculateTotalEvaluationPoints,
  isEvaluatedAttendance,
  isPassingMemorizationLevel,
  isNonEvaluatedAttendance,
} from "@/lib/student-attendance"
import { getLegacyPreviousMemorizationFields, getStoredMemorizedRanges, SURAHS, subtractMemorizedRangeFromRanges } from "@/lib/quran-data"
import { getOrCreateActiveSemester, isNoActiveSemesterError } from "@/lib/semesters"

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

function resolveSurahNumber(value: unknown) {
  const trimmedValue = String(value || "").trim()
  if (!trimmedValue) return null

  const numericValue = Number(trimmedValue)
  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 114) {
    return numericValue
  }

  return SURAHS.find((surah) => surah.name === trimmedValue)?.number || null
}

function getPassingEvaluationMemorizationRange(evaluation: {
  hafiz_level?: string | null
  hafiz_from_surah?: string | null
  hafiz_from_verse?: string | number | null
  hafiz_to_surah?: string | null
  hafiz_to_verse?: string | number | null
}) {
  if (!isPassingMemorizationLevel(evaluation.hafiz_level as any)) {
    return null
  }

  const startSurahNumber = resolveSurahNumber(evaluation.hafiz_from_surah)
  const startVerseNumber = Number(evaluation.hafiz_from_verse) || 1
  const endSurahNumber = resolveSurahNumber(evaluation.hafiz_to_surah)
  const endVerseNumber = Number(evaluation.hafiz_to_verse)

  if (!startSurahNumber || !endSurahNumber || !Number.isInteger(startVerseNumber) || !Number.isInteger(endVerseNumber)) {
    return null
  }

  return getStoredMemorizedRanges({
    memorized_ranges: [{
      startSurahNumber,
      startVerseNumber,
      endSurahNumber,
      endVerseNumber,
    }],
  })[0] || null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("student_id")
    const halaqah = searchParams.get("halaqah")
    const supabase = createAdminClient()

    if (halaqah) {
      if (session.role === "student") {
        return NextResponse.json({ error: "لا يمكنك الوصول إلى حضور الحلقة" }, { status: 403 })
      }

      const teacherScopeError = ensureTeacherScope(session, halaqah)
      if (teacherScopeError) {
        return teacherScopeError
      }

      const todayDate = getKsaDateString()

      const { data, error } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("halaqah", halaqah)
        .eq("date", todayDate)
        .limit(1)

      if (error) {
        return NextResponse.json({ error: "Failed to check" }, { status: 500 })
      }

      return NextResponse.json({ savedToday: (data?.length ?? 0) > 0 })
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })

    if (attendanceError) {
      console.error("[v0] Error fetching attendance records:", attendanceError)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    // Fetch evaluations for each attendance record
    const recordsWithEvaluations = await Promise.all(
      (attendanceData || []).map(async (record) => {
        const { data: evaluations } = await supabase
          .from("evaluations")
          .select("*")
          .eq("attendance_record_id", record.id)
          .order("created_at", { ascending: true });

        // اختر آخر تقييم (الأحدث)
        const lastEval = Array.isArray(evaluations) && evaluations.length > 0
          ? evaluations[evaluations.length - 1]
          : null;

        const isAbsent = isNonEvaluatedAttendance(record.status)
        return {
          id: record.id,
          date: record.date,
          status: record.status,
          notes: record.notes ?? null,
          is_compensation: !!record.is_compensation,
          hafiz_level: isAbsent ? "not_completed" : (lastEval?.hafiz_level || null),
          tikrar_level: isAbsent ? "not_completed" : (lastEval?.tikrar_level || null),
          samaa_level: isAbsent ? "not_completed" : (lastEval?.samaa_level || null),
          rabet_level: isAbsent ? "not_completed" : (lastEval?.rabet_level || null),
          hafiz_from_surah: lastEval?.hafiz_from_surah || null,
          hafiz_from_verse: lastEval?.hafiz_from_verse || null,
          hafiz_to_surah: lastEval?.hafiz_to_surah || null,
          hafiz_to_verse: lastEval?.hafiz_to_verse || null,
          samaa_from_surah: lastEval?.samaa_from_surah || null,
          samaa_from_verse: lastEval?.samaa_from_verse || null,
          samaa_to_surah: lastEval?.samaa_to_surah || null,
          samaa_to_verse: lastEval?.samaa_to_verse || null,
          rabet_from_surah: lastEval?.rabet_from_surah || null,
          rabet_from_verse: lastEval?.rabet_from_verse || null,
          rabet_to_surah: lastEval?.rabet_to_surah || null,
          rabet_to_verse: lastEval?.rabet_to_verse || null,
        }
      }),
    )

    return NextResponse.json({ records: recordsWithEvaluations })
  } catch (error) {
    console.error("[v0] Error in attendance API:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل تسجيل الحضور." }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const body = await request.json()
    const {
      student_id,
      teacher_id,
      halaqah,
      status,
      hafiz_level,
      tikrar_level,
      samaa_level,
      rabet_level,
      hafiz_from_surah,
      hafiz_from_verse,
      hafiz_to_surah,
      hafiz_to_verse,
      samaa_from_surah,
      samaa_from_verse,
      samaa_to_surah,
      samaa_to_verse,
      rabet_from_surah,
      rabet_from_verse,
      rabet_to_surah,
      rabet_to_verse,
      debug_today,
      notes,
    } = body

    // طباعة القيم المستلمة للتشخيص
    console.log("[DEBUG][API] Received attendance POST:")
    console.log("  student_id:", student_id)
    console.log("  teacher_id:", teacher_id)
    console.log("  halaqah:", halaqah)
    console.log("  status:", status)
    console.log("  hafiz_level:", hafiz_level)
    console.log("  tikrar_level:", tikrar_level)
    console.log("  samaa_level:", samaa_level)
    console.log("  rabet_level:", rabet_level)

    if (!student_id || !teacher_id || !halaqah) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, halaqah, teacher_id)
    if (teacherScopeError) {
      return teacherScopeError
    }

    const normalizedStatus = status || "present"
    const isPresent = isEvaluatedAttendance(normalizedStatus)

    if (
      isPresent &&
      !hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })
    ) {
      return NextResponse.json(
        { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر أو المتأخر قبل الحفظ" },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const effectiveTeacherId = isTeacherRole(session.role) ? session.id : teacher_id
    const absenceTemplates = await getAbsenceNotificationTemplates(supabase)

    // Get today's date in YYYY-MM-DD format (Asia/Riyadh timezone)
    const todayDate = getKsaDateString()
    console.log("[DEBUG] تاريخ اليوم في السيرفر (Asia/Riyadh):", todayDate)
    if (debug_today) {
      console.log("[DEBUG] debug_today من المتصفح:", debug_today)
    }

    console.log("[v0] Adding evaluation for student:", student_id, "on date:", todayDate)

    // Check if there's already an attendance record for this student today
    const { data: existingRecords, error: checkError } = await supabase
      .from("attendance_records")
      .select("id, status, is_compensation, created_at")
      .eq("student_id", student_id)
      .eq("date", todayDate)
      .order("created_at", { ascending: true })

    if (checkError) {
      console.error("[v0] Error checking existing attendance:", checkError)
      return NextResponse.json({ error: "Failed to check existing attendance" }, { status: 500 })
    }

    const existingRecord = (existingRecords || []).find((record) => !record.is_compensation) || null

    let attendanceRecord
    const isUpdate = !!existingRecord
    let previousPoints = 0
    const previousStatus = existingRecord?.status ?? null
    let previousMemorizationRange: ReturnType<typeof getPassingEvaluationMemorizationRange> = null

    if (existingRecord) {
      console.log("[v0] Attendance already exists for student today, updating record:", existingRecord.id)

      const { data: oldEvaluation } = await supabase
        .from("evaluations")
        .select("hafiz_level, tikrar_level, samaa_level, rabet_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse")
        .eq("attendance_record_id", existingRecord.id)
        .maybeSingle()

      if (oldEvaluation) {
        previousMemorizationRange = getPassingEvaluationMemorizationRange(oldEvaluation)
        previousPoints = applyAttendancePointsAdjustment(
          calculateTotalEvaluationPoints({
            hafiz_level: oldEvaluation.hafiz_level,
            tikrar_level: oldEvaluation.tikrar_level,
            samaa_level: oldEvaluation.samaa_level,
            rabet_level: oldEvaluation.rabet_level,
          }),
          existingRecord.status,
        )

        await supabase.from("evaluations").delete().eq("attendance_record_id", existingRecord.id)
      }

      const { data: updatedRecord, error: attendanceUpdateError } = await supabase
        .from("attendance_records")
        .update({
          teacher_id: effectiveTeacherId,
          halaqah,
          status: normalizedStatus,
          notes: notes ?? null,
        })
        .eq("id", existingRecord.id)
        .select()
        .single()

      if (attendanceUpdateError) {
        console.error("[v0] Error updating attendance record:", attendanceUpdateError)
        return NextResponse.json({ error: "فشل في تحديث سجل الحضور الحالي" }, { status: 500 })
      }

      attendanceRecord = updatedRecord

      if (previousPoints > 0) {
        const { data: currentStudent, error: fetchStudentError } = await supabase
          .from("students")
          .select("points, store_points")
          .eq("id", student_id)
          .single()

        if (!fetchStudentError && currentStudent) {
          await supabase
            .from("students")
            .update({
              points: Math.max(0, (currentStudent.points || 0) - previousPoints),
              store_points: Math.max(0, (currentStudent.store_points || 0) - previousPoints),
            })
            .eq("id", student_id)
        }
      }
    } else {
      const { data: newRecord, error: attendanceError } = await supabase
        .from("attendance_records")
        .insert({
          student_id,
          teacher_id: effectiveTeacherId,
          halaqah,
          status: normalizedStatus,
          date: todayDate,
          semester_id: activeSemester.id,
          notes: notes ?? null,
        })
        .select()
        .single()

      if (attendanceError) {
        console.error("[v0] Error creating attendance record:", attendanceError)
        const isLateConstraintFailure =
          normalizedStatus === "late" &&
          /status|check|constraint|invalid input value/i.test(
            `${attendanceError.message ?? ""} ${attendanceError.details ?? ""} ${attendanceError.hint ?? ""}`,
          )

        return NextResponse.json(
          {
            error: isLateConstraintFailure
              ? "قاعدة البيانات لا تسمح بعد بحالة متأخر في سجل الحضور. نفذ ملف scripts/042_allow_late_attendance_records.sql ثم أعد المحاولة."
              : attendanceError.message || "Failed to create attendance record",
            details: attendanceError.details ?? null,
            hint: attendanceError.hint ?? null,
            code: attendanceError.code ?? null,
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
      nextStatus: normalizedStatus,
      templates: absenceTemplates,
      skipWhatsApp: true,
    })

    if (!isEvaluatedAttendance(normalizedStatus)) {
      await sendAttendanceSaveGuardianNotification({
        supabase,
        studentId: student_id,
        date: todayDate,
        status: normalizedStatus,
        performedByUserId: session.id,
      })

      return NextResponse.json({
        success: true,
        attendance: attendanceRecord,
        pointsAdded: 0,
        isUpdate,
      })
    }

    if (hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })) {
      const hafizPoints = calculateEvaluationLevelPoints(hafiz_level)
      const tikrarPoints = calculateEvaluationLevelPoints(tikrar_level)
      const samaaPoints = calculateEvaluationLevelPoints(samaa_level)
      const rabetPoints = calculateEvaluationLevelPoints(rabet_level)

      const rawPoints = calculateTotalEvaluationPoints({
        hafiz_level,
        tikrar_level,
        samaa_level,
        rabet_level,
      })
      const totalPoints = applyAttendancePointsAdjustment(rawPoints, normalizedStatus)

      console.log("[v0] Points breakdown:", {
        hafiz: hafizPoints,
        tikrar: tikrarPoints,
        samaa: samaaPoints,
        rabet: rabetPoints,
        raw: rawPoints,
        penalty: normalizedStatus === "late" ? 8 : 0,
        total: totalPoints,
      })

      const { data: evaluation, error: evaluationError } = await supabase
        .from("evaluations")
        .insert({
          attendance_record_id: attendanceRecord.id,
          hafiz_level,
          tikrar_level,
          samaa_level,
          rabet_level,
          hafiz_from_surah,
          hafiz_from_verse,
          hafiz_to_surah,
          hafiz_to_verse,
          samaa_from_surah,
          samaa_from_verse,
          samaa_to_surah,
          samaa_to_verse,
          rabet_from_surah,
          rabet_from_verse,
          rabet_to_surah,
          rabet_to_verse,
        })
        .select()
        .single()

      if (evaluationError) {
        console.error("[v0] Error creating evaluation:", evaluationError)
        await supabase.from("attendance_records").delete().eq("id", attendanceRecord.id)
        return NextResponse.json(
          { error: "فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور" },
          { status: 500 },
        )
      }

      console.log("[v0] Evaluation created:", evaluation.id)

      const evaluationMemorizationRange = getPassingEvaluationMemorizationRange({
        hafiz_level,
        hafiz_from_surah,
        hafiz_from_verse,
        hafiz_to_surah,
        hafiz_to_verse,
      })

      if (totalPoints > 0 || evaluationMemorizationRange) {
        const { data: studentData, error: fetchError } = await supabase
          .from("students")
          .select("points, store_points, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges")
          .eq("id", student_id)
          .single()

        if (fetchError) {
          console.error("[v0] Error fetching student state:", fetchError)
        } else {
          const updatePayload: Record<string, unknown> = {}

          if (totalPoints > 0) {
            const currentPoints = studentData.points || 0
            const currentStorePoints = studentData.store_points || 0
            const newPoints = currentPoints + totalPoints
            const newStorePoints = currentStorePoints + totalPoints

            console.log("[v0] Updating student points and store_points:", {
              currentPoints,
              currentStorePoints,
              addedPoints: totalPoints,
              newPoints,
              newStorePoints,
            })

            updatePayload.points = newPoints
            updatePayload.store_points = newStorePoints
          }

          if (evaluationMemorizationRange || previousMemorizationRange) {
            const currentRanges = getStoredMemorizedRanges(studentData)
            const baseRanges = previousMemorizationRange
              ? subtractMemorizedRangeFromRanges(currentRanges, previousMemorizationRange)
              : currentRanges
            const nextRanges = evaluationMemorizationRange
              ? getStoredMemorizedRanges({ memorized_ranges: [...baseRanges, evaluationMemorizationRange] })
              : baseRanges
            const legacyFields = getLegacyPreviousMemorizationFields(nextRanges)

            updatePayload.memorized_start_surah = legacyFields.prev_start_surah
            updatePayload.memorized_start_verse = legacyFields.prev_start_verse
            updatePayload.memorized_end_surah = legacyFields.prev_end_surah
            updatePayload.memorized_end_verse = legacyFields.prev_end_verse
            updatePayload.memorized_ranges = nextRanges.length > 0 ? nextRanges : null
          }

          const { error: updateError } = await supabase
            .from("students")
            .update(updatePayload)
            .eq("id", student_id)

          if (updateError) {
            console.error("[v0] Error updating student points/memorization:", updateError)
          } else if (totalPoints > 0) {
            console.log("[v0] Student points and store_points updated successfully")
          }
        }
      }

      await sendAttendanceSaveGuardianNotification({
        supabase,
        studentId: student_id,
        date: todayDate,
        status: normalizedStatus,
        performedByUserId: session.id,
        evaluation: {
          hafiz: hafiz_level,
          tikrar: tikrar_level,
          samaa: samaa_level,
          rabet: rabet_level,
        },
        hafizAmount: buildHafizAmountLabel({
          fromSurah: hafiz_from_surah,
          fromVerse: hafiz_from_verse,
          toSurah: hafiz_to_surah,
          toVerse: hafiz_to_verse,
        }),
      })

      return NextResponse.json({
        success: true,
        attendance: attendanceRecord,
        evaluation,
        pointsAdded: totalPoints,
        isUpdate,
      })
    }

    return NextResponse.json(
      { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر أو المتأخر قبل الحفظ" },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Error in attendance POST:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل تسجيل الحضور أو التقييم." }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
