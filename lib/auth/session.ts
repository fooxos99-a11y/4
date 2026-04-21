import crypto from "node:crypto"

export type AppRole = "student" | "teacher" | "deputy_teacher" | "admin" | "supervisor"

export function normalizeAppRole(role: string | null | undefined): AppRole | null {
  const normalizedRole = String(role || "").trim().toLowerCase()

  if (!normalizedRole) {
    return null
  }

  if (["student", "طالب"].includes(normalizedRole)) {
    return "student"
  }

  if (["teacher", "معلم"].includes(normalizedRole)) {
    return "teacher"
  }

  if (["deputy_teacher", "نائب معلم"].includes(normalizedRole)) {
    return "deputy_teacher"
  }

  if (["admin", "مدير", "سكرتير"].includes(normalizedRole)) {
    return "admin"
  }

  if (["supervisor", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"].includes(normalizedRole)) {
    return "supervisor"
  }

  return null
}

export type SessionUser = {
  id: string
  name: string
  role: AppRole
  accountNumber: string
  halaqah?: string
  issuedAt: number
  expiresAt: number
}

export type DailyChallengeAttempt = {
  studentId: string
  date: string
  challengeId: string
  isCorrect: boolean
  status: "started" | "completed"
  updatedAt: number
}

export const SESSION_COOKIE_NAME = "qabas_session"
export const DAILY_CHALLENGE_COOKIE_NAME = "qabas_daily_challenge"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
const DAILY_CHALLENGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
let hasWarnedAboutDevelopmentSessionSecret = false

function toDeterministicUuid(seed: string) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex")
  const part1 = hash.slice(0, 8)
  const part2 = hash.slice(8, 12)
  const part3 = `4${hash.slice(13, 16)}`
  const variant = (Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80
  const part4 = `${variant.toString(16).padStart(2, "0")}${hash.slice(18, 20)}`
  const part5 = hash.slice(20, 32)

  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

export function getDevelopmentBootstrapAdminId(accountNumber: string | number) {
  return toDeterministicUuid(`qabas-dev-admin|${String(accountNumber).trim()}`)
}

export function normalizeSessionUserId(id: string, accountNumber?: string | null) {
  const normalizedId = String(id || "").trim()
  if (!normalizedId.startsWith("dev-admin-")) {
    return normalizedId
  }

  const derivedAccountNumber = normalizedId.replace("dev-admin-", "").trim() || String(accountNumber || "").trim()
  if (!derivedAccountNumber) {
    return normalizedId
  }

  return getDevelopmentBootstrapAdminId(derivedAccountNumber)
}

function getDevelopmentSessionSecret() {
  const fingerprint = [process.cwd(), process.env.USERNAME || "unknown-user", process.env.COMPUTERNAME || "unknown-host"]
    .join("|")

  return crypto.createHash("sha256").update(`qabas-dev-session-secret|${fingerprint}`).digest("hex")
}

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? getDevelopmentSessionSecret() : null)
  )
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url")
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signValue(value: string) {
  const secret = getSessionSecret()
  if (!secret) {
    throw new Error("Session secret is not configured")
  }

  if (
    process.env.NODE_ENV !== "production"
    && !process.env.AUTH_SESSION_SECRET
    && !process.env.SESSION_SECRET
    && !process.env.NEXTAUTH_SECRET
    && !hasWarnedAboutDevelopmentSessionSecret
  ) {
    hasWarnedAboutDevelopmentSessionSecret = true
    console.warn("AUTH_SESSION_SECRET is not configured. Falling back to a development-only session secret.")
  }

  return crypto.createHmac("sha256", secret).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export async function createSignedSessionToken(user: Omit<SessionUser, "issuedAt" | "expiresAt">) {
  const normalizedRole = normalizeAppRole(user.role)
  if (!normalizedRole) {
    throw new Error("Invalid user role for session")
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS
  const payload: SessionUser = {
    ...user,
    id: normalizeSessionUserId(user.id, user.accountNumber),
    role: normalizedRole,
    issuedAt,
    expiresAt,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signValue(encodedPayload)

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  }
}

export async function verifySignedSessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) {
    return null
  }

  if (!getSessionSecret()) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split(".")
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload)
  if (!safeEqual(providedSignature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionUser
    const now = Math.floor(Date.now() / 1000)
    const normalizedRole = normalizeAppRole(payload?.role)

    if (!payload?.id || !normalizedRole || !payload?.accountNumber) {
      return null
    }

    if (payload.expiresAt <= now) {
      return null
    }

    return {
      ...payload,
      id: normalizeSessionUserId(payload.id, payload.accountNumber),
      role: normalizedRole,
    }
  } catch {
    return null
  }
}

export function getCookieValue(cookieHeader: string | null | undefined, cookieName: string) {
  if (!cookieHeader) {
    return null
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))

  if (!cookie) {
    return null
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1))
}

export async function getSessionFromCookieHeader(cookieHeader?: string | null) {
  const token = getCookieValue(cookieHeader, SESSION_COOKIE_NAME)
  return verifySignedSessionToken(token)
}

export function getSessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt * 1000),
  }
}

export function getClearedSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  }
}

export async function createSignedDailyChallengeToken(attempts: DailyChallengeAttempt[]) {
  const sanitizedAttempts = attempts
    .filter((attempt) => attempt?.studentId && attempt?.date && attempt?.challengeId)
    .slice(-30)

  const encodedPayload = toBase64Url(JSON.stringify(sanitizedAttempts))
  const signature = signValue(encodedPayload)
  const expiresAt = Math.floor(Date.now() / 1000) + DAILY_CHALLENGE_COOKIE_MAX_AGE_SECONDS

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  }
}

export async function verifySignedDailyChallengeToken(token?: string | null): Promise<DailyChallengeAttempt[]> {
  if (!token) {
    return []
  }

  const [encodedPayload, providedSignature] = token.split(".")
  if (!encodedPayload || !providedSignature) {
    return []
  }

  const expectedSignature = signValue(encodedPayload)
  if (!safeEqual(providedSignature, expectedSignature)) {
    return []
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as DailyChallengeAttempt[]

    if (!Array.isArray(payload)) {
      return []
    }

    return payload.filter(
      (attempt) =>
        typeof attempt?.studentId === "string" &&
        typeof attempt?.date === "string" &&
        typeof attempt?.challengeId === "string" &&
        typeof attempt?.isCorrect === "boolean" &&
        (attempt?.status === "started" || attempt?.status === "completed") &&
        typeof attempt?.updatedAt === "number",
    )
  } catch {
    return []
  }
}

export async function getDailyChallengeAttemptsFromCookieHeader(cookieHeader?: string | null) {
  const token = getCookieValue(cookieHeader, DAILY_CHALLENGE_COOKIE_NAME)
  return verifySignedDailyChallengeToken(token)
}

export function getDailyChallengeCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt * 1000),
  }
}