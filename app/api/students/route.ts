import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import {
  ensureStudentAccess,
  getRequestSession,
  isPrivilegedRole,
  isTeacherRole,
  requireRoles,
  sanitizeStudentForPublic,
} from "@/lib/auth/guards"
import {
  getContiguousCompletedJuzRange,
  getJuzBounds,
  getJuzCoverageFromRanges,
  getLegacyPreviousMemorizationFields,
  getNormalizedCompletedJuzs,
  hasScatteredCompletedJuzs,
  getPendingMasteryJuzs,
  getStoredMemorizedRanges,
  subtractMemorizedRangeFromRanges,
  type PreviousMemorizationRange,
} from "@/lib/quran-data"
import { getOrCreateActiveSemester, isNoActiveSemesterError } from "@/lib/semesters"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف";

  if (error instanceof Error) {
    return error.message || "حدث خطأ غير معروف";
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate);
  }

  return String(error);
}

function normalizeStudentMastery<T extends { current_juzs?: number[] | null; completed_juzs?: number[] | null }>(student: T): T {
  return {
    ...student,
    current_juzs: getPendingMasteryJuzs(student.current_juzs, student.completed_juzs),
  }
}

function isMissingStudentExamsTable(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /student_exams/i.test(message) && /does not exist|not exist|relation|table/i.test(message)
}

function isMissingResetStudentMemorizationFunction(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /reset_student_memorization_atomic/i.test(message) && /does not exist|not exist|function|rpc/i.test(message)
}

function isMissingRemoveStudentMemorizedRangeFunction(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /remove_student_memorized_range_atomic/i.test(message) && /does not exist|not exist|function|rpc/i.test(message)
}

async function clearPassedStudentExams(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  semesterId: string,
  juzNumbers?: number[],
) {
  try {
    let query = supabase
      .from("student_exams")
      .delete()
      .eq("student_id", studentId)
      .eq("semester_id", semesterId)
      .eq("passed", true)

    if (Array.isArray(juzNumbers)) {
      if (juzNumbers.length === 0) {
        return
      }

      query = query.in("juz_number", juzNumbers)
    }

    const { error } = await query
    if (error && !isMissingStudentExamsTable(error)) {
      throw error
    }
  } catch (error) {
    if (!isMissingStudentExamsTable(error)) {
      throw error
    }
  }
}

function mergeStudentPassedExamJuzs<T extends {
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}>(student: T, passedExamJuzs?: number[]) {
  const nextCompletedJuzs = Array.from(new Set([
    ...getNormalizedCompletedJuzs(student.completed_juzs),
    ...(passedExamJuzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30),
  ])).sort((left, right) => left - right)

  const completedRange = hasScatteredCompletedJuzs(nextCompletedJuzs)
    ? null
    : getContiguousCompletedJuzRange(nextCompletedJuzs)

  return normalizeStudentMastery({
    ...student,
    completed_juzs: nextCompletedJuzs,
    current_juzs: getPendingMasteryJuzs(student.current_juzs, nextCompletedJuzs),
    memorized_start_surah: student.memorized_start_surah || completedRange?.startSurahNumber || null,
    memorized_start_verse: student.memorized_start_verse || completedRange?.startVerseNumber || null,
    memorized_end_surah: student.memorized_end_surah || completedRange?.endSurahNumber || null,
    memorized_end_verse: student.memorized_end_verse || completedRange?.endVerseNumber || null,
  })
}

function buildStudentMemorizedRanges(student: {
  memorized_ranges?: PreviousMemorizationRange[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
  completed_juzs?: number[] | null
}) {
  const storedRanges = getStoredMemorizedRanges(student)
  const completedJuzRanges = getNormalizedCompletedJuzs(student.completed_juzs)
    .map((juzNumber) => getJuzBounds(juzNumber))
    .filter((bounds): bounds is NonNullable<ReturnType<typeof getJuzBounds>> => Boolean(bounds))
    .map((bounds) => ({
      startSurahNumber: bounds.startSurahNumber,
      startVerseNumber: bounds.startVerseNumber,
      endSurahNumber: bounds.endSurahNumber,
      endVerseNumber: bounds.endVerseNumber,
    }))

  return getStoredMemorizedRanges({
    memorized_ranges: [...storedRanges, ...completedJuzRanges],
  })
}

function normalizeRemovalRange(value: unknown) {
  if (!value || typeof value !== "object") return null

  const candidate = value as Record<string, unknown>
  const normalized = getStoredMemorizedRanges({
    memorized_ranges: [{
      startSurahNumber: Number(candidate.startSurahNumber ?? candidate.start_surah_number),
      startVerseNumber: Number(candidate.startVerseNumber ?? candidate.start_verse_number ?? candidate.startVerse ?? candidate.start_verse),
      endSurahNumber: Number(candidate.endSurahNumber ?? candidate.end_surah_number),
      endVerseNumber: Number(candidate.endVerseNumber ?? candidate.end_verse_number ?? candidate.endVerse ?? candidate.end_verse),
    }],
  })

  return normalized[0] || null
}

function normalizeGuardianPhone(phoneNumber: unknown) {
  if (phoneNumber === undefined) return undefined
  if (phoneNumber === null) return null

  const trimmedPhone = String(phoneNumber).trim()
  if (!trimmedPhone) return null

  return normalizeGuardianPhoneForStorage(trimmedPhone)
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const body = await request.json()
    const {
      name,
      circle_name,
      id_number,
      account_number,
      guardian_phone,
      initial_points = 0,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      memorized_ranges,
      completed_juzs,
      current_juzs,
    } = body

    console.log("[v0] POST /api/students - Received data:", {
      name,
      circle_name,
      id_number,
      account_number,
      guardian_phone,
      initial_points,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      memorized_ranges,
      completed_juzs,
      current_juzs,
    })

    if (!name || !circle_name) {
      return NextResponse.json({ error: "الاسم واسم الحلقة مطلوبان" }, { status: 400 })
    }

    if (isTeacherRole(session.role) && (circle_name || "").trim() !== (session.halaqah || "").trim()) {
      return NextResponse.json({ error: "لا يمكنك إضافة طالب إلى حلقة أخرى" }, { status: 403 })
    }

    if (account_number) {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("account_number", account_number)
        .maybeSingle()

      if (existingStudent) {
        return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("account_number", account_number)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json({ error: "رقم الحساب موجود بالفعل في النظام" }, { status: 400 })
      }
    }

    let normalizedGuardianPhone: string | null | undefined
    try {
      normalizedGuardianPhone = normalizeGuardianPhone(guardian_phone)
    } catch {
      return NextResponse.json({ error: "رقم ولي الأمر غير صالح" }, { status: 400 })
    }

    const insertData: any = {
      name,
      halaqah: (circle_name || "").trim(),
      points: initial_points,
      id_number,
      account_number,
      guardian_phone: normalizedGuardianPhone,
    }

    if (memorized_start_surah !== undefined) insertData.memorized_start_surah = memorized_start_surah
    if (memorized_start_verse !== undefined) insertData.memorized_start_verse = memorized_start_verse
    if (memorized_end_surah !== undefined) insertData.memorized_end_surah = memorized_end_surah
    if (memorized_end_verse !== undefined) insertData.memorized_end_verse = memorized_end_verse
    if (memorized_ranges !== undefined) insertData.memorized_ranges = memorized_ranges
    if (completed_juzs !== undefined) insertData.completed_juzs = completed_juzs
    if (current_juzs !== undefined) insertData.current_juzs = current_juzs

    const { data, error } = await supabase.from("students").insert([insertData]).select().single()

    if (error) {
      console.error("[v0] Error adding student:", error)
      return NextResponse.json(
        {
          error: getSupabaseErrorMessage(error),
          source: "students.insert",
        },
        { status: 500 }
      )
    }

    console.log("[v0] Student added to database:", data)

    const studentWithCircleName = {
      ...normalizeStudentMastery(data),
      circle_name: data.halaqah,
    }

    return NextResponse.json({ success: true, student: studentWithCircleName }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error in POST /api/students:", error)
    return NextResponse.json({ error: getSupabaseErrorMessage(error) }, { status: 500 })
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
    const studentId = searchParams.get("id")

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { error } = await supabase.from("students").delete().eq("id", studentId)

    if (error) {
      console.error("[v0] Error removing student:", error)
      return NextResponse.json({ error: "فشل في إزالة الطالب" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/students:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const session = await getRequestSession(request)
    const { searchParams } = new URL(request.url)
    const circleName = searchParams.get("circle")
    const accountNumber = searchParams.get("account_number")

    console.log("[v0] GET /api/students - circle:", circleName, "account:", accountNumber)

    let query = supabase.from("students").select("*")

    if (accountNumber) {
      if (!session) {
        return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
      }

      if (
        !isPrivilegedRole(session.role) &&
        !isTeacherRole(session.role) &&
        String(session.accountNumber) !== String(accountNumber)
      ) {
        return NextResponse.json({ error: "لا يمكنك الوصول إلى بيانات طالب آخر" }, { status: 403 })
      }

      query = query.eq("account_number", Number(accountNumber)) as typeof query
    } else if (circleName) {
      query = query.eq("halaqah", circleName.trim()) as typeof query
    } else if (session && isTeacherRole(session.role)) {
      query = query.eq("halaqah", (session.halaqah || "").trim()) as typeof query
    }

    const { data, error } = await (query as any).order("points", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching students:", error)
      return NextResponse.json({ error: "فشل في جلب الطلاب" }, { status: 500 })
    }

    const filtered: any[] = data || [];

    console.log("[v0] Students fetched from database:", filtered)

    let passedExamJuzsByStudentId = new Map<string, number[]>()

    if (filtered.length > 0) {
      try {
        const activeSemester = await getOrCreateActiveSemester(supabase)
        const studentIds = filtered.map((student: any) => String(student.id)).filter(Boolean)
        const { data: passedExams, error: passedExamsError } = await supabase
          .from("student_exams")
          .select("student_id, juz_number")
          .eq("semester_id", activeSemester.id)
          .eq("passed", true)
          .in("student_id", studentIds)

        if (passedExamsError) {
          if (!isMissingStudentExamsTable(passedExamsError)) {
            console.error("[students] Failed to load passed exams for mastery fallback:", passedExamsError)
          }
        } else {
          for (const exam of passedExams || []) {
            const studentId = String(exam.student_id || "")
            const juzNumber = Number(exam.juz_number)
            if (!studentId || !Number.isInteger(juzNumber)) {
              continue
            }

            const existing = passedExamJuzsByStudentId.get(studentId) || []
            existing.push(juzNumber)
            passedExamJuzsByStudentId.set(studentId, existing)
          }
        }
      } catch (error) {
        if (!isNoActiveSemesterError(error)) {
          console.error("[students] Mastery fallback lookup failed:", error)
        }
      }
    }

    let studentsWithCircleName = filtered.map((student: any) => ({
      ...mergeStudentPassedExamJuzs(student, passedExamJuzsByStudentId.get(String(student.id))),
      circle_name: student.halaqah,
    }))

    if (accountNumber && session && isTeacherRole(session.role)) {
      studentsWithCircleName = studentsWithCircleName.filter(
        (student: any) => (student.halaqah || "").trim() === (session.halaqah || "").trim(),
      )

      if (studentsWithCircleName.length === 0) {
        return NextResponse.json({ error: "الطالب لا يتبع حلقتك" }, { status: 403 })
      }
    }

    if (circleName && session && isTeacherRole(session.role) && circleName.trim() !== (session.halaqah || "").trim()) {
      return NextResponse.json({ error: "لا يمكنك الوصول إلى طلاب حلقة أخرى" }, { status: 403 })
    }

    if (!session || (!accountNumber && !isPrivilegedRole(session.role) && !isTeacherRole(session.role))) {
      studentsWithCircleName = studentsWithCircleName.map((student: any) => sanitizeStudentForPublic(student))
    }

    return NextResponse.json(
      { students: studentsWithCircleName },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store'
        }
      }
    )
  } catch (error) {
    console.error("[v0] Error in GET /api/students:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getRequestSession(request)
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const {
      id,
      name,
      phone_number,
      id_number,
      account_number,
      points,
      add_points,
      rank,
      guardian_phone,
      halaqah,
      reset_memorized,
      remove_memorized_range,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      memorized_ranges,
      completed_juzs,
      current_juzs,
    } = body

    const studentId = id || new URL(request.url).searchParams.get("id")

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    if (session.role === "student") {
      const allowedStudentPatchKeys = new Set(["id"])
      const bodyKeys = Object.keys(body)
      const hasOnlyAllowedKeys = bodyKeys.every((key) => allowedStudentPatchKeys.has(key))

      if (!hasOnlyAllowedKeys) {
        return NextResponse.json({ error: "لا يمكنك تعديل هذه البيانات" }, { status: 403 })
      }

      return NextResponse.json({ error: "لا يمكنك تعديل النقاط مباشرة" }, { status: 403 })
    }

    if (reset_memorized === true) {
      if (!isPrivilegedRole(session.role) && !isTeacherRole(session.role)) {
        return NextResponse.json({ error: "لا يمكنك إعادة ضبط المحفوظ" }, { status: 403 })
      }

      const activeSemester = await getOrCreateActiveSemester(supabase)
      const { data, error } = await adminSupabase.rpc("reset_student_memorization_atomic", {
        p_student_id: studentId,
        p_semester_id: activeSemester.id,
      })

      if (error) {
        if (isMissingResetStudentMemorizationFunction(error)) {
          return NextResponse.json({ error: "دالة إعادة الحفظ الذرية غير موجودة بعد. نفذ ملف scripts/053_create_reset_student_memorization_atomic.sql ثم أعد المحاولة." }, { status: 503 })
        }

        console.error("[students] Error resetting memorized range atomically:", getSupabaseErrorMessage(error))
        return NextResponse.json({ error: "فشل في إعادة ضبط محفوظ الطالب" }, { status: 500 })
      }

      return NextResponse.json({ success: true, student: normalizeStudentMastery(data) }, { status: 200 })
    }

    if (remove_memorized_range) {
      if (!isPrivilegedRole(session.role) && !isTeacherRole(session.role)) {
        return NextResponse.json({ error: "لا يمكنك تعديل المحفوظ بهذه الطريقة" }, { status: 403 })
      }

      const activeSemester = await getOrCreateActiveSemester(supabase)
      const removalRange = normalizeRemovalRange(remove_memorized_range)
      if (!removalRange) {
        return NextResponse.json({ error: "بيانات الجزء المراد حذفه غير مكتملة" }, { status: 400 })
      }

      const { data: studentMemorizedData, error: studentMemorizedError } = await supabase
        .from("students")
        .select("memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges, completed_juzs, current_juzs")
        .eq("id", studentId)
        .single()

      if (studentMemorizedError) {
        return NextResponse.json({ error: "فشل في جلب محفوظ الطالب الحالي" }, { status: 500 })
      }

      const currentRanges = buildStudentMemorizedRanges(studentMemorizedData)
      if (currentRanges.length === 0) {
        return NextResponse.json({ error: "لا يوجد محفوظ حالي يمكن تعديله" }, { status: 400 })
      }

      const nextRanges = subtractMemorizedRangeFromRanges(currentRanges, removalRange)
      if (JSON.stringify(nextRanges) === JSON.stringify(currentRanges)) {
        return NextResponse.json({ error: "الجزء المحدد خارج محفوظ الطالب الحالي" }, { status: 400 })
      }

      const legacyFields = getLegacyPreviousMemorizationFields(nextRanges)
      const juzCoverage = getJuzCoverageFromRanges(nextRanges)
      const previousCompletedJuzs = getNormalizedCompletedJuzs(studentMemorizedData?.completed_juzs)
      const nextCompletedJuzs = Array.from(juzCoverage.completedJuzs).sort((left, right) => left - right)
      const nextCurrentJuzs = Array.from(juzCoverage.currentJuzs).sort((left, right) => left - right)
      const removedCompletedJuzs = previousCompletedJuzs.filter((juzNumber) => !nextCompletedJuzs.includes(juzNumber))

      const { data, error } = await adminSupabase.rpc("remove_student_memorized_range_atomic", {
        p_student_id: studentId,
        p_semester_id: activeSemester.id,
        p_has_previous: legacyFields.has_previous,
        p_prev_start_surah: legacyFields.prev_start_surah,
        p_prev_start_verse: legacyFields.prev_start_verse,
        p_prev_end_surah: legacyFields.prev_end_surah,
        p_prev_end_verse: legacyFields.prev_end_verse,
        p_previous_memorization_ranges: nextRanges.length > 0 ? nextRanges : null,
        p_completed_juzs: nextCompletedJuzs,
        p_current_juzs: nextCurrentJuzs,
        p_removed_completed_juzs: removedCompletedJuzs,
      })

      if (error) {
        if (isMissingRemoveStudentMemorizedRangeFunction(error)) {
          return NextResponse.json({ error: "دالة حذف جزء من المحفوظ الذرية غير موجودة بعد. نفذ ملف scripts/054_create_remove_student_memorized_range_atomic.sql ثم أعد المحاولة." }, { status: 503 })
        }

        console.error("[students] Error removing memorized range atomically:", getSupabaseErrorMessage(error))
        return NextResponse.json({ error: "فشل في حذف الجزء المحدد من محفوظ الطالب" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        student: normalizeStudentMastery(data),
        memorized_ranges: nextRanges,
      }, { status: 200 })
    }

    const updateData: any = {}

    if (name !== undefined) {
      const normalizedName = String(name || "").trim()
      if (!normalizedName) {
        return NextResponse.json({ error: "اسم الطالب مطلوب" }, { status: 400 })
      }

      updateData.name = normalizedName
    }
    
    // Check if halaqah changed
    if (halaqah !== undefined) {
      if (!isPrivilegedRole(session.role) && !isTeacherRole(session.role)) {
        return NextResponse.json({ error: "لا يمكنك نقل الطالب بين الحلقات" }, { status: 403 })
      }

      updateData.halaqah = String(halaqah || "").trim()
      const { data: currentStudentHalaqah } = await supabase
        .from("students")
        .select("halaqah")
        .eq("id", studentId)
        .single()
      
      if (currentStudentHalaqah && currentStudentHalaqah.halaqah !== updateData.halaqah) {
        // Drop pathway progress if student moved to a different circle
        await supabase.from("pathway_level_completions").delete().eq("student_id", studentId)
      }
    }

    if (phone_number !== undefined) updateData.phone_number = phone_number
    if (id_number !== undefined) updateData.id_number = id_number
    if (account_number !== undefined) {
      const normalizedAccountNumber = account_number === null || account_number === "" ? null : Number(account_number)

      if (normalizedAccountNumber !== null && Number.isNaN(normalizedAccountNumber)) {
        return NextResponse.json({ error: "رقم الحساب غير صالح" }, { status: 400 })
      }

      if (normalizedAccountNumber !== null) {
        const { data: existingStudent, error: existingStudentError } = await supabase
          .from("students")
          .select("id")
          .eq("account_number", normalizedAccountNumber)
          .neq("id", studentId)
          .maybeSingle()

        if (existingStudentError) {
          return NextResponse.json({ error: "فشل في التحقق من رقم الحساب" }, { status: 500 })
        }

        if (existingStudent) {
          return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
        }

        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("id")
          .eq("account_number", normalizedAccountNumber)
          .maybeSingle()

        if (existingUserError) {
          return NextResponse.json({ error: "فشل في التحقق من رقم الحساب" }, { status: 500 })
        }

        if (existingUser) {
          return NextResponse.json({ error: "رقم الحساب موجود بالفعل في النظام" }, { status: 400 })
        }
      }

      updateData.account_number = normalizedAccountNumber
    }
    if (rank !== undefined) updateData.rank = rank
    if (guardian_phone !== undefined) {
      try {
        updateData.guardian_phone = normalizeGuardianPhone(guardian_phone)
      } catch {
        return NextResponse.json({ error: "رقم ولي الأمر غير صالح" }, { status: 400 })
      }
    }
    if (memorized_start_surah !== undefined) updateData.memorized_start_surah = memorized_start_surah
    if (memorized_start_verse !== undefined) updateData.memorized_start_verse = memorized_start_verse
    if (memorized_end_surah !== undefined) updateData.memorized_end_surah = memorized_end_surah
    if (memorized_end_verse !== undefined) updateData.memorized_end_verse = memorized_end_verse
    if (memorized_ranges !== undefined) updateData.memorized_ranges = memorized_ranges
    if (completed_juzs !== undefined) updateData.completed_juzs = completed_juzs
    if (current_juzs !== undefined) updateData.current_juzs = current_juzs
    if (add_points !== undefined) {
      const { data: currentStudent, error: fetchError } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", studentId)
        .single()

      if (fetchError) {
        return NextResponse.json({ error: "فشل في جلب معلومات الطالب" }, { status: 500 })
      }

      const currentPoints = currentStudent?.points || 0
      const currentStorePoints = currentStudent?.store_points || 0
      const newPoints = currentPoints + add_points
      const newStorePoints = currentStorePoints + add_points

      updateData.points = newPoints
      updateData.store_points = newStorePoints
      console.log(`[v0] Adding points - Current: ${currentPoints}, Add: ${add_points}, New: ${newPoints}, Store: ${currentStorePoints} -> ${newStorePoints}`)
    } else if (points !== undefined) {
      updateData.points = points
    }

    const { data, error } = await supabase.from("students").update(updateData).eq("id", studentId).select().single()

    if (error) {
      console.error("[v0] Error updating student:", error.message)
      return NextResponse.json({ error: "فشل في تحديث الطالب" }, { status: 500 })
    }

    return NextResponse.json({ success: true, student: normalizeStudentMastery(data) }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/students:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل تنفيذ هذه العملية." }, { status: 409 })
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
