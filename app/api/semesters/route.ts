import { NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import { DEFAULT_ACTIVE_SEMESTER_NAME, getActiveSemester, getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { buildSemesterArchiveData, getSemesterSnapshot } from "@/lib/semester-archive"
import { getSaudiDateString } from "@/lib/saudi-time"
import { createAdminClient } from "@/lib/supabase/admin"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function isDeletePolicyMissing(error: unknown) {
  const text = getErrorMessage(error).toLowerCase()
  return text.includes("row-level security") || text.includes("permission denied") || text.includes("42501")
}

function getSemesterEndBoundary(semester: { end_date?: string | null; archived_at?: string | null; start_date: string }) {
  return semester.end_date || semester.archived_at?.slice(0, 10) || semester.start_date
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const activeSemester = await getActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    const semesterId = String(searchParams.get("semester_id") || "").trim()
    const attendanceDate = String(searchParams.get("attendance_date") || "").trim()

    if (!semesterId) {
      const { data: semesters, error: semestersError } = await supabase
        .from("semesters")
        .select("id, name, status, start_date, end_date, archived_at, archive_snapshot, created_at, updated_at")
        .order("status", { ascending: true })
        .order("created_at", { ascending: false })

      if (semestersError) {
        throw semestersError
      }

      const enrichedSemesters = await Promise.all(
        (semesters || []).map(async (semester) => {
          const snapshot = getSemesterSnapshot(semester.archive_snapshot)

          if (snapshot && semester.status === "archived") {
            return {
              ...semester,
              is_active: semester.id === activeSemester?.id,
              plans_count: snapshot.counts.plans_count,
              student_records_count: snapshot.counts.student_records_count,
              absences_count: snapshot.counts.absences_count,
              finance_count: snapshot.counts.finance_count,
            }
          }

          const [plansResult, attendanceResult, absencesResult, invoiceResult, expenseResult, incomeResult, tripResult] = await Promise.all([
            supabase.from("student_plans").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
            supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
            supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("semester_id", semester.id).eq("status", "absent"),
            supabase.from("finance_invoices").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
            supabase.from("finance_expenses").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
            supabase.from("finance_incomes").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
            supabase.from("finance_trips").select("id", { count: "exact", head: true }).eq("semester_id", semester.id),
          ])

          return {
            ...semester,
            is_active: semester.id === activeSemester?.id,
            plans_count: plansResult.count || 0,
            student_records_count: attendanceResult.count || 0,
            absences_count: absencesResult.count || 0,
            finance_count:
              (invoiceResult.count || 0) +
              (expenseResult.count || 0) +
              (incomeResult.count || 0) +
              (tripResult.count || 0),
          }
        }),
      )

      return NextResponse.json({ semesters: enrichedSemesters, activeSemesterId: activeSemester?.id || null })
    }

    const { data: semester, error: semesterError } = await supabase
      .from("semesters")
      .select("id, name, status, start_date, end_date, archived_at, archive_snapshot, created_at, updated_at")
      .eq("id", semesterId)
      .maybeSingle()

    if (semesterError) {
      throw semesterError
    }

    if (!semester?.id) {
      return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 })
    }

    if (attendanceDate) {
      const semesterEndBoundary = getSemesterEndBoundary(semester)

      if (attendanceDate < semester.start_date || attendanceDate > semesterEndBoundary) {
        return NextResponse.json({
          semester,
          attendanceDate,
          dailyStudentRecords: [],
          error: "التاريخ المحدد خارج حدود هذا الفصل",
        })
      }

      const [{ data: planRows, error: planRowsError }, { data: attendanceRows, error: attendanceRowsError }] = await Promise.all([
        supabase.from("student_plans").select("student_id").eq("semester_id", semester.id),
        supabase.from("attendance_records").select("student_id").eq("semester_id", semester.id).eq("date", attendanceDate),
      ])

      if (planRowsError) {
        throw planRowsError
      }
      if (attendanceRowsError) {
        throw attendanceRowsError
      }

      const studentIds = Array.from(
        new Set([...(planRows || []), ...(attendanceRows || [])].map((row) => String(row.student_id || "")).filter(Boolean)),
      )

      if (studentIds.length === 0) {
        return NextResponse.json({
          semester,
          attendanceDate,
          dailyStudentRecords: [],
        })
      }

      const [{ data: studentsData, error: studentsError }, { data: recordsData, error: recordsError }] = await Promise.all([
        supabase
          .from("students")
          .select("id, name, account_number, halaqah")
          .in("id", studentIds)
          .order("halaqah", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("attendance_records")
          .select("id, student_id, halaqah, date, status, notes, is_compensation")
          .eq("semester_id", semester.id)
          .eq("date", attendanceDate)
          .in("student_id", studentIds),
      ])

      if (studentsError) throw studentsError
      if (recordsError) throw recordsError

      const records = recordsData || []
      const recordIds = records.map((record) => record.id)

      const evaluationMap = new Map<string, AttendanceEvaluation>()

      if (recordIds.length > 0) {
        const { data: evaluationsData, error: evaluationsError } = await supabase
          .from("evaluations")
          .select("attendance_record_id, hafiz_level, tikrar_level, samaa_level, rabet_level, created_at")
          .in("attendance_record_id", recordIds)
          .order("created_at", { ascending: true })

        if (evaluationsError) {
          throw evaluationsError
        }

        for (const evaluation of evaluationsData || []) {
          evaluationMap.set(String(evaluation.attendance_record_id), {
            hafiz_level: evaluation.hafiz_level,
            tikrar_level: evaluation.tikrar_level,
            samaa_level: evaluation.samaa_level,
            rabet_level: evaluation.rabet_level,
          })
        }
      }

      const recordMap = new Map<string, (typeof records)[number]>()
      for (const record of records) {
        recordMap.set(String(record.student_id), record)
      }

      const dailyStudentRecords = (studentsData || []).map((student) => {
        const record = recordMap.get(String(student.id))
        const evaluation = record ? evaluationMap.get(String(record.id)) || null : null

        return {
          student_id: String(student.id),
          student_name: student.name || "طالب",
          account_number: student.account_number || null,
          halaqah: record?.halaqah || student.halaqah || null,
          date: attendanceDate,
          status: record?.status || null,
          notes: record?.notes || null,
          is_compensation: record?.is_compensation || false,
          hafiz_level: evaluation?.hafiz_level || null,
          tikrar_level: evaluation?.tikrar_level || null,
          samaa_level: evaluation?.samaa_level || null,
          rabet_level: evaluation?.rabet_level || null,
        }
      })

      return NextResponse.json({
        semester,
        attendanceDate,
        dailyStudentRecords,
      })
    }

    const [plansResult, attendanceResult, invoicesResult, expensesResult, incomesResult, tripsResult] = await Promise.all([
      supabase
        .from("student_plans")
        .select("id, student_id, start_surah_name, end_surah_name, start_date, total_pages, total_days, daily_pages, muraajaa_pages, rabt_pages, direction")
        .eq("semester_id", semester.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("attendance_records")
        .select("id, student_id, halaqah, date, status, notes, is_compensation, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
        .eq("semester_id", semester.id)
        .order("date", { ascending: false }),
      supabase
        .from("finance_invoices")
        .select("id, title, vendor, invoice_number, amount, issue_date, due_date, status")
        .eq("semester_id", semester.id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("finance_expenses")
        .select("id, title, beneficiary, payment_method, amount, expense_date")
        .eq("semester_id", semester.id)
        .order("expense_date", { ascending: false }),
      supabase
        .from("finance_incomes")
        .select("id, title, source, amount, income_date")
        .eq("semester_id", semester.id)
        .order("income_date", { ascending: false }),
      supabase
        .from("finance_trips")
        .select("id, title, trip_date, costs")
        .eq("semester_id", semester.id)
        .order("trip_date", { ascending: false }),
    ])

    if (plansResult.error) throw plansResult.error
    if (attendanceResult.error) throw attendanceResult.error
    if (invoicesResult.error) throw invoicesResult.error
    if (expensesResult.error) throw expensesResult.error
    if (incomesResult.error) throw incomesResult.error
    if (tripsResult.error) throw tripsResult.error

    const attendanceRows = attendanceResult.data || []
    const plansRows = plansResult.data || []
    const invoiceRows = invoicesResult.data || []
    const expenseRows = expensesResult.data || []
    const incomeRows = incomesResult.data || []
    const tripRows = tripsResult.data || []

    const studentIds = Array.from(
      new Set(
        [...plansRows.map((plan) => String(plan.student_id || "")), ...attendanceRows.map((row) => String(row.student_id || ""))].filter(Boolean),
      ),
    )

    const studentMap = new Map<string, { id: string; name?: string | null; account_number?: number | null; halaqah?: string | null }>()

    if (studentIds.length > 0) {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, account_number, halaqah")
        .in("id", studentIds)

      if (studentsError) {
        throw studentsError
      }

      for (const student of studentsData || []) {
        studentMap.set(String(student.id), student)
      }
    }

    const archiveBundle = buildSemesterArchiveData({
      plansRows,
      attendanceRows,
      invoiceRows,
      expenseRows,
      incomeRows,
      tripRows,
      studentMap,
      generatedAt: semester.archived_at || semester.updated_at,
    })
    const snapshot = getSemesterSnapshot(semester.archive_snapshot)

    return NextResponse.json({
      semester,
      stats: snapshot?.stats || archiveBundle.stats,
      plans: archiveBundle.plans,
      studentRecords: archiveBundle.studentRecords,
      absences: archiveBundle.absences,
      finance: archiveBundle.finance,
      snapshot,
      isActive: semester.id === activeSemester?.id,
    })
  } catch (error) {
    console.error("[semesters][GET]", error)
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const name = String(body.name || "").trim() || DEFAULT_ACTIVE_SEMESTER_NAME
    const startDate = String(body.start_date || "").trim() || getSaudiDateString()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "تاريخ بداية الفصل غير صالح" }, { status: 400 })
    }

    const activeSemester = await getActiveSemester(supabase)
    if (activeSemester?.id) {
      return NextResponse.json({ error: "يوجد فصل نشط بالفعل. أنهِ الفصل الحالي أولاً." }, { status: 409 })
    }

    const { data: existingSemester } = await supabase
      .from("semesters")
      .select("id")
      .ilike("name", name)
      .maybeSingle()

    if (existingSemester?.id) {
      return NextResponse.json({ error: "يوجد فصل محفوظ بنفس الاسم بالفعل" }, { status: 400 })
    }

    const { data: newSemester, error: createSemesterError } = await supabase
      .from("semesters")
      .insert({
        name,
        status: "active",
        start_date: startDate,
      })
      .select("id, name, status, start_date, end_date, archived_at, archive_snapshot, created_at, updated_at")
      .single()

    if (createSemesterError) {
      throw createSemesterError
    }

    return NextResponse.json({ success: true, semester: newSemester }, { status: 201 })
  } catch (error) {
    console.error("[semesters][POST]", error)
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const activeSemester = await getActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    const semesterId = String(searchParams.get("semester_id") || "").trim()

    if (!semesterId) {
      return NextResponse.json({ error: "معرف الفصل مطلوب" }, { status: 400 })
    }

    const { data: semester, error: semesterError } = await supabase
      .from("semesters")
      .select("id, name, status")
      .eq("id", semesterId)
      .maybeSingle()

    if (semesterError) {
      throw semesterError
    }

    if (!semester?.id) {
      return NextResponse.json({ error: "الفصل غير موجود" }, { status: 404 })
    }

    if (semester.id === activeSemester?.id || semester.status === "active") {
      return NextResponse.json({ error: "لا يمكن حذف الفصل النشط" }, { status: 400 })
    }

    const { data: attendanceIds, error: attendanceIdsError } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("semester_id", semester.id)

    if (attendanceIdsError) throw attendanceIdsError

    const recordIds = (attendanceIds || []).map((row) => row.id)

    const [evaluationsDelete, attendanceDelete, invoiceDelete, expenseDelete, incomeDelete, tripDelete, plansDelete, examsDelete, schedulesDelete] = await Promise.all([
      recordIds.length > 0 ? supabase.from("evaluations").delete().in("attendance_record_id", recordIds) : Promise.resolve({ error: null }),
      supabase.from("attendance_records").delete().eq("semester_id", semester.id),
      supabase.from("finance_invoices").delete().eq("semester_id", semester.id),
      supabase.from("finance_expenses").delete().eq("semester_id", semester.id),
      supabase.from("finance_incomes").delete().eq("semester_id", semester.id),
      supabase.from("finance_trips").delete().eq("semester_id", semester.id),
      supabase.from("student_plans").delete().eq("semester_id", semester.id),
      supabase.from("student_exams").delete().eq("semester_id", semester.id),
      supabase.from("exam_schedules").delete().eq("semester_id", semester.id),
    ])

    if (evaluationsDelete.error) throw evaluationsDelete.error
    if (attendanceDelete.error) throw attendanceDelete.error
    if (invoiceDelete.error) throw invoiceDelete.error
    if (expenseDelete.error) throw expenseDelete.error
    if (incomeDelete.error) throw incomeDelete.error
    if (tripDelete.error) throw tripDelete.error
    if (plansDelete.error) throw plansDelete.error
    if (examsDelete.error) throw examsDelete.error
    if (schedulesDelete.error) throw schedulesDelete.error

    const { error: deleteSemesterError } = await supabase
      .from("semesters")
      .delete()
      .eq("id", semester.id)

    if (deleteSemesterError) {
      throw deleteSemesterError
    }

    return NextResponse.json({ success: true, deletedSemesterId: semester.id, deletedSemesterName: semester.name })
  } catch (error) {
    console.error("[semesters][DELETE]", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا" }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    if (isDeletePolicyMissing(error)) {
      return NextResponse.json({ error: "حذف الفصل يحتاج سياسة DELETE لجدول الفصول. نفذ ملف scripts/047_allow_delete_semesters.sql ثم أعد المحاولة." }, { status: 500 })
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}