import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function normalizePhoneNumber(phoneNumber: unknown) {
  if (phoneNumber === undefined) return undefined
  if (phoneNumber === null) return null

  const trimmedPhone = String(phoneNumber).trim()
  if (!trimmedPhone) return null

  return normalizeGuardianPhoneForStorage(trimmedPhone)
}

function mapUserWriteError(error: unknown) {
  const message = getErrorMessage(error)

  if (/account_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الحساب موجود بالفعل"
  }

  if (/id_number/i.test(message) && /duplicate|unique/i.test(message)) {
    return "رقم الهوية موجود بالفعل"
  }

  if (/phone_number/i.test(message) && /invalid|phone/i.test(message)) {
    return "رقم الجوال غير صالح"
  }

  return message
}

function isStaffRole(role: string) {
  return !["student", "teacher", "deputy_teacher", "طالب", "معلم", "نائب معلم"].includes(role)
}

function isProtectedAdminAccount(accountNumber: number) {
  return accountNumber === 2 || accountNumber === 1483
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const { searchParams } = new URL(request.url)
    const currentOnly = searchParams.get("current") === "1"

    const supabase = createAdminClient()

    if (currentOnly) {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, account_number, phone_number, id_number, role")
        .eq("id", session.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data || !isStaffRole(String(data.role || ""))) {
        return NextResponse.json({ error: "لم يتم العثور على بيانات الإداري" }, { status: 404 })
      }

      return NextResponse.json({ user: data })
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, account_number, phone_number, id_number, role")
      .order("account_number", { ascending: true })

    if (error) {
      throw error
    }

    const users = (data || []).filter((user) => {
      const accountNumber = Number(user.account_number)
      return isStaffRole(String(user.role || "")) && !isProtectedAdminAccount(accountNumber)
    })
    return NextResponse.json({ users })
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

    const body = await request.json()
    const name = String(body.name || "").trim()
    const idNumber = String(body.id_number || "").trim()
    const role = String(body.role || "").trim()
    const accountNumber = Number.parseInt(String(body.account_number || ""), 10)

    if (!name || !role || Number.isNaN(accountNumber)) {
      return NextResponse.json({ error: "الاسم ورقم الحساب والمسمى الوظيفي مطلوبة" }, { status: 400 })
    }

    let normalizedPhoneNumber: string | null | undefined
    try {
      normalizedPhoneNumber = normalizePhoneNumber(body.phone_number)
    } catch {
      return NextResponse.json({ error: "رقم الجوال غير صالح" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_number", accountNumber)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("users")
      .insert({
        name,
        account_number: accountNumber,
        phone_number: normalizedPhoneNumber,
        id_number: idNumber || null,
        role,
        halaqah: "",
        password_hash: "",
      })
      .select("id, name, account_number, phone_number, id_number, role")
      .single()

    if (error) {
      return NextResponse.json({ error: mapUserWriteError(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data }, { status: 201 })
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

    const { session } = auth

    const body = await request.json()
    const id = String(body.id || "").trim()
    if (!id) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("account_number")
      .eq("id", id)
      .maybeSingle()

    if (existingUserError) {
      throw existingUserError
    }

    const isProtectedAccount = isProtectedAdminAccount(Number(existingUser?.account_number))
    const isSelfUpdate = String(session.id) === String(id)

    if (isProtectedAccount && !isSelfUpdate) {
      return NextResponse.json({ error: "هذا الحساب الإداري ثابت ولا يمكن تعديله" }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = String(body.name || "").trim()
    if (!isProtectedAccount && body.role !== undefined) updateData.role = String(body.role || "").trim()
    if (body.id_number !== undefined) updateData.id_number = String(body.id_number || "").trim() || null
    if (!isProtectedAccount && body.account_number !== undefined) {
      const accountNumber = Number.parseInt(String(body.account_number || ""), 10)
      if (Number.isNaN(accountNumber)) {
        return NextResponse.json({ error: "رقم الحساب غير صالح" }, { status: 400 })
      }
      updateData.account_number = accountNumber
    }
    if (body.phone_number !== undefined) {
      try {
        updateData.phone_number = normalizePhoneNumber(body.phone_number)
      } catch {
        return NextResponse.json({ error: "رقم الجوال غير صالح" }, { status: 400 })
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات لتحديثها" }, { status: 400 })
    }

    if (isProtectedAccount && !isSelfUpdate) {
      return NextResponse.json({ error: "هذا الحساب الإداري ثابت ولا يمكن تعديله" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, name, account_number, phone_number, id_number, role")
      .single()

    if (error) {
      return NextResponse.json({ error: mapUserWriteError(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get("id") || "").trim()
    if (!id) {
      return NextResponse.json({ error: "معرف المستخدم مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("account_number")
      .eq("id", id)
      .maybeSingle()

    if (existingUserError) {
      throw existingUserError
    }

    if (isProtectedAdminAccount(Number(existingUser?.account_number))) {
      return NextResponse.json({ error: "هذا الحساب الإداري ثابت ولا يمكن حذفه" }, { status: 403 })
    }

    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}