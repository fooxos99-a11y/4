import { getSaudiDateString } from "@/lib/saudi-time"

export const DEFAULT_ACTIVE_SEMESTER_NAME = "الفصل الحالي"
const NO_ACTIVE_SEMESTER_CODE = "NO_ACTIVE_SEMESTER"

export type SemesterRow = {
  id: string
  name: string
  status: "active" | "archived"
  start_date: string
  end_date?: string | null
  archived_at?: string | null
  archive_snapshot?: unknown
  created_at: string
  updated_at: string
}

export function isMissingSemestersTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown }
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    (typeof candidate.message === "string" && candidate.message.includes("semesters")) ||
    (typeof candidate.details === "string" && candidate.details.includes("semesters"))
  )
}

export function isNoActiveSemesterError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === NO_ACTIVE_SEMESTER_CODE || candidate.message === NO_ACTIVE_SEMESTER_CODE
}

export async function getActiveSemester(supabase: any) {
  const { data: existingSemester, error: existingSemesterError } = await supabase
    .from("semesters")
    .select("id, name, status, start_date, end_date, archived_at, created_at, updated_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSemesterError) {
    throw existingSemesterError
  }

  return existingSemester?.id ? (existingSemester as SemesterRow) : null
}

export async function getOrCreateActiveSemester(supabase: any) {
  const existingSemester = await getActiveSemester(supabase)
  if (existingSemester?.id) {
    return existingSemester
  }

  throw Object.assign(new Error(NO_ACTIVE_SEMESTER_CODE), { code: NO_ACTIVE_SEMESTER_CODE })
}