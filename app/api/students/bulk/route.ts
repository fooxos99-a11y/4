import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { isTeacherRole, requireRoles } from "@/lib/auth/guards"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"

type BulkStudentInput = {
  name?: string | null
  id_number?: string | null
  account_number?: string | number | null
  guardian_phone?: string | null
}

function normalizeLocalizedDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0)

    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660)
    }

    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0)
    }

    return digit
  })
}

function normalizeDigits(value: unknown) {
  return normalizeLocalizedDigits(String(value || "")).replace(/\D/g, "")
}

function formatBulkStudentInsertError(error: unknown) {
  const message = getSupabaseErrorMessage(error)

  if (/account_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الحساب موجود بالفعل"
  }

  if (/id_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الهوية موجود بالفعل"
  }

  if (/guardian_phone/i.test(message) && /invalid|phone/i.test(message)) {
    return "رقم ولي الأمر غير صالح"
  }

  return message
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
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
    const students = Array.isArray(body.students) ? (body.students as BulkStudentInput[]) : []
    const requestedCircle = String(body.circle_name || "").trim()
    const effectiveCircle = isTeacherRole(session.role) ? String(session.halaqah || "").trim() : requestedCircle

    if (!effectiveCircle) {
      return NextResponse.json({ error: "اسم الحلقة مطلوب" }, { status: 400 })
    }

    if (isTeacherRole(session.role) && requestedCircle && requestedCircle !== effectiveCircle) {
      return NextResponse.json({ error: "لا يمكنك إضافة طلاب إلى حلقة أخرى" }, { status: 403 })
    }

    const normalizedRows = students.map((student, index) => {
      const name = String(student.name || "").trim()
      const idNumber = normalizeDigits(student.id_number)
      const guardianPhone = String(student.guardian_phone || "").trim()
      const rawAccountNumber = normalizeDigits(student.account_number)
      const effectiveAccountNumber = rawAccountNumber || idNumber
      const accountNumber = effectiveAccountNumber ? Number(effectiveAccountNumber) : null
      const errors: string[] = []
      let normalizedGuardianPhone: string | null = null

      if (!name) {
        errors.push("الاسم مطلوب")
      }

      if (!effectiveAccountNumber) {
        errors.push("رقم الهوية أو رقم الحساب مطلوب")
      }

      if (String(student.id_number || "").trim() && !idNumber) {
        errors.push("رقم الهوية غير صالح")
      }

      if (effectiveAccountNumber && Number.isNaN(accountNumber)) {
        errors.push("رقم الحساب غير صالح")
      }

      if (guardianPhone) {
        try {
          normalizedGuardianPhone = normalizeGuardianPhoneForStorage(guardianPhone)
        } catch {
          errors.push("رقم ولي الأمر غير صالح")
        }
      }

      return {
        rowNumber: index + 1,
        name,
        id_number: effectiveAccountNumber || null,
        guardian_phone: normalizedGuardianPhone,
        account_number: Number.isNaN(accountNumber) ? null : accountNumber,
        errors,
      }
    })

    const duplicateFileAccounts = new Set<number>()
    const duplicateFileIds = new Set<string>()
    const seenAccounts = new Set<number>()
    const seenIds = new Set<string>()
    for (const row of normalizedRows) {
      if (row.account_number === null) continue
      if (seenAccounts.has(row.account_number)) {
        duplicateFileAccounts.add(row.account_number)
      }
      seenAccounts.add(row.account_number)

      if (row.id_number) {
        if (seenIds.has(row.id_number)) {
          duplicateFileIds.add(row.id_number)
        }
        seenIds.add(row.id_number)
      }
    }

    const accountNumbers = normalizedRows
      .map((row) => row.account_number)
      .filter((value): value is number => value !== null)

    const existingStudentAccounts = new Set<number>()
    const existingUserAccounts = new Set<number>()
    const existingStudentIds = new Set<string>()
    const existingUserIds = new Set<string>()
    const idNumbers = normalizedRows.map((row) => row.id_number).filter((value): value is string => Boolean(value))

    if (accountNumbers.length > 0) {
      const { data: existingStudents } = await supabase.from("students").select("account_number").in("account_number", accountNumbers)
      const { data: existingUsers } = await supabase.from("users").select("account_number").in("account_number", accountNumbers)

      for (const row of existingStudents || []) {
        if (typeof row.account_number === "number") existingStudentAccounts.add(row.account_number)
      }

      for (const row of existingUsers || []) {
        if (typeof row.account_number === "number") existingUserAccounts.add(row.account_number)
      }
    }

    if (idNumbers.length > 0) {
      const { data: existingStudentsById } = await supabase.from("students").select("id_number").in("id_number", idNumbers)
      const { data: existingUsersById } = await supabase.from("users").select("id_number").in("id_number", idNumbers)

      for (const row of existingStudentsById || []) {
        const value = String(row.id_number || "").trim()
        if (value) existingStudentIds.add(value)
      }

      for (const row of existingUsersById || []) {
        const value = String(row.id_number || "").trim()
        if (value) existingUserIds.add(value)
      }
    }

    const rejectedRows: Array<{ rowNumber: number; name: string; reason: string }> = []
    let insertedCount = 0

    for (const row of normalizedRows) {
      const reasons = [...row.errors]

      if (row.account_number !== null && duplicateFileAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب مكرر داخل الملف")
      }

      if (row.account_number !== null && existingStudentAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب موجود بالفعل")
      }

      if (row.account_number !== null && existingUserAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب موجود بالفعل في النظام")
      }

      if (row.id_number && duplicateFileIds.has(row.id_number)) {
        reasons.push("رقم الهوية مكرر داخل الملف")
      }

      if (row.id_number && existingStudentIds.has(row.id_number)) {
        reasons.push("رقم الهوية موجود بالفعل")
      }

      if (row.id_number && existingUserIds.has(row.id_number)) {
        reasons.push("رقم الهوية موجود بالفعل في النظام")
      }

      if (reasons.length > 0) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          name: row.name,
          reason: reasons.join("، "),
        })
        continue
      }

      const { error } = await supabase.from("students").insert([
        {
          name: row.name,
          halaqah: effectiveCircle,
          points: 0,
          id_number: row.id_number,
          account_number: row.account_number,
          guardian_phone: row.guardian_phone,
        },
      ])

      if (error) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          name: row.name,
          reason: formatBulkStudentInsertError(error),
        })
        continue
      }

      insertedCount += 1
    }

    return NextResponse.json(
      {
        success: true,
        insertedCount,
        rejectedCount: rejectedRows.length,
        rejectedRows,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[students/bulk] Error importing students:", error)
    return NextResponse.json({ error: getSupabaseErrorMessage(error) }, { status: 500 })
  }
}