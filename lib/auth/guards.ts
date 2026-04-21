import { NextResponse } from "next/server"
import { type AppRole, type SessionUser, getSessionFromCookieHeader } from "@/lib/auth/session"

function normalizeHalaqah(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

export function isPrivilegedRole(role: AppRole) {
  return role === "admin" || role === "supervisor"
}

export function isTeacherRole(role: AppRole) {
  return role === "teacher" || role === "deputy_teacher"
}

export async function getRequestSession(request: Request) {
  return getSessionFromCookieHeader(request.headers.get("cookie"))
}

export function unauthorizedResponse(message = "يجب تسجيل الدخول أولاً") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = "ليس لديك صلاحية الوصول") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFoundResponse(message = "العنصر غير موجود") {
  return NextResponse.json({ error: message }, { status: 404 })
}

export async function requireRoles(request: Request, allowedRoles: AppRole[]) {
  const session = await getRequestSession(request)

  if (!session) {
    return { response: unauthorizedResponse() }
  }

  if (!allowedRoles.includes(session.role)) {
    return { response: forbiddenResponse() }
  }

  return { session }
}

export function ensureTeacherScope(session: SessionUser, halaqah?: string | null, teacherId?: string | null) {
  if (!isTeacherRole(session.role)) {
    return null
  }

  if (teacherId && String(teacherId) !== String(session.id)) {
    return forbiddenResponse("لا يمكنك تنفيذ العملية باسم معلم آخر")
  }

  if (halaqah && normalizeHalaqah(halaqah) !== normalizeHalaqah(session.halaqah)) {
    return forbiddenResponse("لا يمكنك الوصول إلى حلقة أخرى")
  }

  return null
}

export async function ensureStudentAccess(supabase: any, session: SessionUser, studentId: string) {
  const { data: student, error } = await supabase
    .from("students")
    .select("id, name, halaqah, account_number")
    .eq("id", studentId)
    .maybeSingle()

  if (error) {
    return { response: NextResponse.json({ error: "تعذر التحقق من الطالب" }, { status: 500 }) }
  }

  if (!student) {
    return { response: notFoundResponse("الطالب غير موجود") }
  }

  if (isPrivilegedRole(session.role)) {
    return { student }
  }

  if (session.role === "student") {
    if (String(student.id) !== String(session.id)) {
      return { response: forbiddenResponse("لا يمكنك الوصول إلى بيانات طالب آخر") }
    }

    return { student }
  }

  if (isTeacherRole(session.role)) {
    if (normalizeHalaqah(student.halaqah) !== normalizeHalaqah(session.halaqah)) {
      return { response: forbiddenResponse("الطالب لا يتبع حلقتك") }
    }

    return { student }
  }

  return { response: forbiddenResponse() }
}

export function sanitizeStudentForPublic(student: any) {
  return {
    id: student.id,
    name: student.name,
    halaqah: student.halaqah,
    circle_name: student.halaqah,
    points: student.points ?? 0,
    level: student.level ?? null,
    rank: student.rank ?? null,
    preferred_theme: student.preferred_theme ?? null,
    created_at: student.created_at ?? null,
  }
}