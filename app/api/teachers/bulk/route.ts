import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/guards"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"

type BulkTeacherInput = {
  name?: string | null
  id_number?: string | null
  account_number?: string | number | null
  phone_number?: string | null
  halaqah?: string | null
  role?: string | null
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

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function formatBulkTeacherInsertError(error: unknown) {
  const message = getSupabaseErrorMessage(error)

  if (/account_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الحساب موجود بالفعل"
  }

  if (/id_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الهوية موجود بالفعل"
  }

  return message
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const body = await request.json()
    const teachers = Array.isArray(body.teachers) ? (body.teachers as BulkTeacherInput[]) : []

    const normalizedRows = teachers.map((teacher, index) => {
      const name = String(teacher.name || "").trim()
      const idNumber = normalizeDigits(teacher.id_number)
      const accountNumberDigits = normalizeDigits(teacher.account_number || teacher.id_number)
      const phoneNumber = String(teacher.phone_number || "").trim()
      const halaqah = String(teacher.halaqah || "").trim()
      const accountNumber = accountNumberDigits ? Number(accountNumberDigits) : null
      const role = teacher.role === "deputy_teacher" ? "deputy_teacher" : "teacher"
      const errors: string[] = []
      let normalizedPhoneNumber: string | null = null

      if (!name) {
        errors.push("اسم المعلم مطلوب")
      }

      if (!idNumber) {
        errors.push("رقم الهوية مطلوب")
      }

      if (!accountNumberDigits || Number.isNaN(accountNumber)) {
        errors.push("رقم الحساب غير صالح")
      }

      if (!halaqah) {
        errors.push("اختيار الحلقة مطلوب")
      }

      if (phoneNumber) {
        try {
          normalizedPhoneNumber = normalizeGuardianPhoneForStorage(phoneNumber)
        } catch {
          errors.push("رقم الجوال غير صالح")
        }
      }

      return {
        rowNumber: index + 1,
        name,
        id_number: idNumber,
        account_number: Number.isNaN(accountNumber) ? null : accountNumber,
        phone_number: normalizedPhoneNumber,
        halaqah,
        role,
        errors,
      }
    })

    const duplicateFileAccounts = new Set<number>()
    const duplicateFileIds = new Set<string>()
    const seenAccounts = new Set<number>()
    const seenIds = new Set<string>()

    for (const row of normalizedRows) {
      if (row.account_number !== null) {
        if (seenAccounts.has(row.account_number)) {
          duplicateFileAccounts.add(row.account_number)
        }
        seenAccounts.add(row.account_number)
      }

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

    const idNumbers = normalizedRows
      .map((row) => row.id_number)
      .filter((value): value is string => Boolean(value))

    const existingUserAccounts = new Set<number>()
    const existingStudentAccounts = new Set<number>()
    const existingUserIds = new Set<string>()
    const existingStudentIds = new Set<string>()

    if (accountNumbers.length > 0) {
      const { data: existingUsers } = await supabase.from("users").select("account_number").in("account_number", accountNumbers)
      const { data: existingStudents } = await supabase.from("students").select("account_number").in("account_number", accountNumbers)

      for (const row of existingUsers || []) {
        if (typeof row.account_number === "number") existingUserAccounts.add(row.account_number)
      }

      for (const row of existingStudents || []) {
        if (typeof row.account_number === "number") existingStudentAccounts.add(row.account_number)
      }
    }

    if (idNumbers.length > 0) {
      const { data: existingUsersById } = await supabase.from("users").select("id_number").in("id_number", idNumbers)
      const { data: existingStudentsById } = await supabase.from("students").select("id_number").in("id_number", idNumbers)

      for (const row of existingUsersById || []) {
        const value = String(row.id_number || "").trim()
        if (value) existingUserIds.add(value)
      }

      for (const row of existingStudentsById || []) {
        const value = String(row.id_number || "").trim()
        if (value) existingStudentIds.add(value)
      }
    }

    const rejectedRows: Array<{ rowNumber: number; name: string; reason: string }> = []
    let insertedCount = 0

    for (const row of normalizedRows) {
      const reasons = [...row.errors]

      if (row.account_number !== null && duplicateFileAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب مكرر داخل الملف")
      }

      if (row.id_number && duplicateFileIds.has(row.id_number)) {
        reasons.push("رقم الهوية مكرر داخل الملف")
      }

      if (row.account_number !== null && existingUserAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب موجود بالفعل")
      }

      if (row.account_number !== null && existingStudentAccounts.has(row.account_number)) {
        reasons.push("رقم الحساب موجود بالفعل في النظام")
      }

      if (row.id_number && existingUserIds.has(row.id_number)) {
        reasons.push("رقم الهوية موجود بالفعل")
      }

      if (row.id_number && existingStudentIds.has(row.id_number)) {
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

      const { error } = await supabase.from("users").insert([
        {
          name: row.name,
          id_number: row.id_number,
          account_number: row.account_number,
          phone_number: row.phone_number,
          halaqah: row.halaqah,
          role: row.role,
          password_hash: "",
        },
      ])

      if (error) {
        rejectedRows.push({
          rowNumber: row.rowNumber,
          name: row.name,
          reason: formatBulkTeacherInsertError(error),
        })
        continue
      }

      insertedCount += 1
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      rejectedCount: rejectedRows.length,
      rejectedRows,
    })
  } catch (error) {
    console.error("[teachers/bulk] Error importing teachers:", error)
    return NextResponse.json({ error: getSupabaseErrorMessage(error) }, { status: 500 })
  }
}