import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createSignedSessionToken,
  getDevelopmentBootstrapAdminId,
  getClearedSessionCookieOptions,
  getSessionCookieOptions,
  getSessionFromCookieHeader,
  normalizeAppRole,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session"

function createAuthSuccessResponse(user: {
  id: string
  name: string
  role: "student" | "teacher" | "deputy_teacher" | "admin" | "supervisor"
  accountNumber: string | number
  halaqah?: string
}) {
  return createSignedSessionToken({
    id: user.id,
    name: user.name,
    role: user.role,
    accountNumber: String(user.accountNumber),
    halaqah: user.halaqah || "",
  }).then(({ token, expiresAt }) => {
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        accountNumber: user.accountNumber,
        halaqah: user.halaqah || "",
      },
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt))
    return response
  })
}

function getDevelopmentBootstrapAdmin(accountNumber: number) {
  if (process.env.NODE_ENV === "production") {
    return null
  }

  const bootstrapAccountNumber = Number.parseInt(process.env.DEV_ADMIN_ACCOUNT_NUMBER || "", 10)
  if (!bootstrapAccountNumber || bootstrapAccountNumber !== accountNumber) {
    return null
  }

  return {
    id: getDevelopmentBootstrapAdminId(bootstrapAccountNumber),
    name: process.env.DEV_ADMIN_NAME || "صالح السويد",
    role: "admin" as const,
    accountNumber: bootstrapAccountNumber,
    halaqah: "",
  }
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookieHeader(request.headers.get("cookie"))

  if (!session) {
    return NextResponse.json({ error: "لا توجد جلسة صالحة" }, { status: 401 })
  }

  return NextResponse.json({ success: true, user: session })
}

export async function POST(request: NextRequest) {
  try {
    const { account_number } = await request.json()

    if (!account_number || typeof account_number !== "string" || !/^[0-9]+$/.test(account_number)) {
      return NextResponse.json({ error: "رقم الحساب يجب أن يكون أرقام فقط" }, { status: 400 })
    }

    const accountNum = Number.parseInt(account_number)
    if (isNaN(accountNum) || accountNum <= 0) {
      return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 400 })
    }

    const bootstrapAdmin = getDevelopmentBootstrapAdmin(accountNum)
    if (bootstrapAdmin) {
      return createAuthSuccessResponse(bootstrapAdmin)
    }

    const supabase = createAdminClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, role, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الحساب" }, { status: 500 })
    }

    if (user) {
      const normalizedRole = normalizeAppRole(user.role)

      if (!normalizedRole) {
        return NextResponse.json({ error: "الدور الوظيفي لهذا الحساب غير مدعوم" }, { status: 403 })
      }

      return createAuthSuccessResponse({
        id: String(user.id),
        name: user.name,
        role: normalizedRole,
        accountNumber: user.account_number,
        halaqah: user.halaqah || "",
      })
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (studentError) {
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الحساب" }, { status: 500 })
    }

    if (student) {
      return createAuthSuccessResponse({
        id: String(student.id),
        name: student.name,
        role: "student",
        accountNumber: student.account_number,
        halaqah: student.halaqah || "",
      })
    }

    return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 401 })
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE_NAME, "", getClearedSessionCookieOptions())
  return response
}
