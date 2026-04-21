"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { BookOpen, Check, Lock, Star } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"

type PathwayLevelRow = {
  id?: number
  level_number: number
  title?: string | null
  description?: string | null
  is_locked?: boolean | null
  points?: number | null
  halaqah?: string | null
}

type PathwayLevel = {
  id: number
  title: string
  description: string
  isLocked: boolean
  isCompleted: boolean
  userPoints: number
}

function isUuid(value: string | null | undefined) {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default function PathwaysPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthorized, user } = useVerifiedRoleAccess(["student"])

  const [levels, setLevels] = useState<PathwayLevel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthorized || !user) {
      setIsLoading(false)
      return
    }

    const verifiedUser = user

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    async function resolveStudentId() {
      const currentUserStr = localStorage.getItem("currentUser")
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null

      const storedStudentId = localStorage.getItem("studentId")
      if (isUuid(storedStudentId)) {
        return storedStudentId
      }

      const accountNumber = verifiedUser.accountNumber || currentUser?.account_number || currentUser?.id
      if (!accountNumber) {
        return null
      }

      const { data: studentRow } = await supabase
        .from("students")
        .select("id")
        .eq("account_number", Number(accountNumber))
        .maybeSingle()

      if (studentRow?.id) {
        const normalizedId = String(studentRow.id)
        localStorage.setItem("studentId", normalizedId)
        return normalizedId
      }

      return null
    }

    async function fetchLevels(studentHalaqah?: string) {
      let query = supabase.from("pathway_levels").select("id, level_number, title, description, is_locked, points, halaqah")

      if (studentHalaqah) {
        query = query.eq("halaqah", studentHalaqah)
      }

      const { data, error } = await query.order("level_number")

      if (error) {
        throw error
      }

      return (data || []) as PathwayLevelRow[]
    }

    async function loadPathwayData() {
      const currentUserStr = localStorage.getItem("currentUser")
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null
      const studentHalaqah = verifiedUser.halaqah || currentUser?.halaqah || undefined

      const [studentId, levelsFromDb] = await Promise.all([resolveStudentId(), fetchLevels(studentHalaqah)])

      let completedMap: Record<number, number> = {}

      if (studentId) {
        const { data: completions } = await supabase
          .from("pathway_level_completions")
          .select("level_number, points")
          .eq("student_id", studentId)

        completedMap = (completions || []).reduce<Record<number, number>>((accumulator, completion) => {
          accumulator[completion.level_number] = completion.points ?? 0
          return accumulator
        }, {})
      }

      const processedLevels = levelsFromDb.map((level) => {
        const isCompleted = Object.prototype.hasOwnProperty.call(completedMap, level.level_number)

        return {
          id: level.level_number,
          title: level.title || `المستوى ${level.level_number}`,
          description: level.description || "",
          isLocked: level.is_locked === true,
          isCompleted,
          userPoints: isCompleted ? completedMap[level.level_number] : Number(level.points ?? 100),
        }
      })

      setLevels(processedLevels)
    }

    void loadPathwayData()
      .catch((error) => {
        console.error("[pathways] Failed to load pathways:", error)
        setLevels([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [authLoading, isAuthorized, user])

  const completedLevelsCount = levels.filter((level) => level.isCompleted).length
  const totalPoints = levels
    .filter((level) => level.isCompleted)
    .reduce((sum, level) => sum + Number(level.userPoints || 0), 0)
  const progressPercentage = levels.length > 0 ? Math.round((completedLevelsCount / levels.length) * 100) : 0

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center md:mb-12">
            <div className="mb-3 flex items-center justify-center gap-2 md:mb-4 md:gap-3">
              <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-[#3453a7]" />
              <h1 className="inline-block bg-gradient-to-r from-[#0f2f6d] via-[#1f4d9a] to-[#3667b2] bg-clip-text pb-1 text-3xl font-bold leading-[1.2] text-transparent md:text-5xl">
                المسار
              </h1>
            </div>
          </div>

          <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2f6d] via-[#1f4d9a] to-[#7db7ff] p-6 text-white shadow-2xl md:mb-12 md:rounded-3xl md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-[#cfe0ff]/14" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 -translate-x-1/4 translate-y-1/2 rounded-full bg-[#dce9ff]/12" />

            <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-10">
              <div className="md:col-span-2">
                <div className="mb-4 flex items-center">
                  <p className="text-sm font-bold tracking-wide opacity-90 md:text-base">التقدم في المسار</p>
                </div>

                <div className="relative h-7 overflow-hidden rounded-full border border-white/14 bg-[#153874]/55 shadow-inner md:h-9">
                  <div
                    className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg, #dbe9ff 0%, #bcd4ff 45%, #8fb8ff 100%)",
                      boxShadow: "0 0 18px 3px rgba(191,217,255,0.22)",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                  </div>

                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute bottom-1 top-1 w-px bg-white/18"
                      style={{ right: `${100 - milestone}%` }}
                    />
                  ))}
                </div>

                <div className="mt-2 flex justify-between px-1">
                  {[0, 25, 50, 75, 100].map((milestone) => (
                    <span key={milestone} className="text-[10px] font-semibold text-[#f5f9ff] md:text-xs">
                      {milestone}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 p-4 md:gap-4 md:p-6">
                <Star className="h-9 w-9 translate-y-[1px] fill-[#ffd766] text-[#ffd766] drop-shadow-[0_0_14px_rgba(255,215,102,0.30)] md:h-12 md:w-12" strokeWidth={2.1} />

                <div
                  className="text-5xl font-black leading-none tracking-tight md:text-6xl"
                  style={{ color: "#f5f9ff", textShadow: "0 10px 30px rgba(8,24,61,0.28), 0 2px 0 rgba(16,44,100,0.35)" }}
                >
                  {totalPoints}
                </div>

                <div className="mt-0 flex flex-col items-start">
                  <p className="text-xs font-semibold tracking-widest text-[#dbe9ff]/80 md:text-sm">نقطة</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {levels.map((level) => (
              <div
                key={level.id}
                onClick={() => !level.isLocked && !level.isCompleted && router.push(`/pathways/level/${level.id}`)}
                className={`group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
                  level.isCompleted
                    ? "cursor-not-allowed"
                    : level.isLocked
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3453a7]/20"
                }`}
                style={{
                  background: level.isCompleted
                    ? "linear-gradient(160deg, #eef3ff 0%, #dfe8ff 100%)"
                    : level.isLocked
                      ? "linear-gradient(160deg, #f4f4f4 0%, #e8e8e8 100%)"
                      : "linear-gradient(160deg, #ffffff 0%, #f7faff 100%)",
                  border: level.isCompleted
                    ? "1.5px solid rgba(52,83,167,0.32)"
                    : level.isLocked
                      ? "1.5px solid rgba(0,0,0,0.08)"
                      : "1.5px solid rgba(52,83,167,0.24)",
                  boxShadow: level.isLocked ? "none" : "0 2px 12px rgba(52,83,167,0.08)",
                }}
              >
                <div
                  className="h-1 w-full"
                  style={{
                    background: level.isCompleted
                      ? "linear-gradient(90deg, #3453a7, #7db7ff, #3453a7)"
                      : level.isLocked
                        ? "#d1d5db"
                        : "linear-gradient(90deg, #3453a7, #7db7ff)",
                    opacity: level.isLocked ? 0.5 : 1,
                  }}
                />

                <div className="flex flex-col flex-1 p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black md:h-14 md:w-14 md:text-2xl"
                      style={{
                        background: level.isCompleted
                          ? "linear-gradient(145deg, #7db7ff, #3453a7)"
                          : level.isLocked
                            ? "#e5e7eb"
                            : "linear-gradient(145deg, #7db7ff, #3453a7)",
                        color: level.isLocked ? "#9ca3af" : "#ffffff",
                        boxShadow: level.isLocked ? "none" : "0 2px 8px rgba(52,83,167,0.28)",
                      }}
                    >
                      {level.id}
                    </div>

                    {level.isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-[#3453a7] flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {level.isLocked && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  <h3 className={`text-base md:text-lg font-bold leading-tight mb-1 ${level.isLocked ? "text-gray-400" : "text-[#1a2332]"}`}>
                    {level.title}
                  </h3>

                  <p className={`text-xs md:text-sm leading-relaxed line-clamp-2 flex-1 ${level.isLocked ? "text-gray-300" : "text-gray-400"}`}>
                    {level.description}
                  </p>

                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-1 mb-3">
                      <Star
                        className={`h-4 w-4 ${level.isLocked ? "fill-gray-300 text-gray-300" : "fill-[#ffd766] text-[#ffd766] drop-shadow-[0_0_4px_rgba(255,215,102,0.30)]"}`}
                        strokeWidth={1.8}
                      />
                      <span className={`text-sm font-bold ${level.isLocked ? "text-gray-300" : "text-[#3453a7]"}`}>
                        {level.userPoints} نقطة
                      </span>
                    </div>

                    {level.isCompleted ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold text-[#3453a7] bg-[#3453a7]/10 border border-[#3453a7]/25">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        مكتمل
                      </div>
                    ) : level.isLocked ? (
                      <div className="w-full h-10 md:h-11 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-300 bg-gray-100">
                        مقفل
                      </div>
                    ) : (
                      <Button
                        className="h-10 w-full rounded-lg bg-transparent text-sm font-bold text-white transition-all duration-200 group-hover:shadow-md hover:bg-transparent md:h-11"
                        style={{ background: "linear-gradient(135deg, #3453a7 0%, #4a67b7 100%)" }}
                      >
                        ابدأ الآن
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
