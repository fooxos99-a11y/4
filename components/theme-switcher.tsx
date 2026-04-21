"use client"

import { useState, useEffect } from "react"
import { Palette } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"
import { ThemeRankPreview } from "@/components/theme-rank-preview"

const THEMES = {
  beige_default: {
    primary: "#3453a7",
    secondary: "#4f73d1",
    tertiary: "#20335f",
    gradient: "linear-gradient(135deg, #eef3ff 0%, #dce7ff 48%, #c7d8ff 100%)",
  },
  bats: {
    primary: "#000000",
    secondary: "#1a1a1a",
    tertiary: "#2a2a2a",
    gradient: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
  },
  fire: {
    primary: "#ea580c",
    secondary: "#dc2626",
    tertiary: "#b91c1c",
    gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
  },
  snow: {
    primary: "#0284c7",
    secondary: "#0369a1",
    tertiary: "#0c4a6e",
    gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
  },
  leaves: {
    primary: "#22c55e",
    secondary: "#16a34a",
    tertiary: "#15803d",
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  },
  royal: {
    primary: "#3453a7",
    secondary: "#4f73d1",
    tertiary: "#20335f",
    gradient: "linear-gradient(135deg, #20335f 0%, #3453a7 52%, #4f73d1 100%)",
  },
  dawn: {
    primary: "#fbbf24",
    secondary: "#f97316",
    tertiary: "#dc2626",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f97316 20%, #ea580c 40%, #dc2626 60%, #b91c1c 80%, #7c1d12 100%)",
  },
  galaxy: {
    primary: "#7c3aed",
    secondary: "#a78bfa",
    tertiary: "#c4b5fd",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 20%, #7c3aed 40%, #a78bfa 60%, #c4b5fd 80%, #ddd6fe 100%)",
  },
  sunset_gold: {
    primary: "#f59e0b",
    secondary: "#d97706",
    tertiary: "#b45309",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 20%, #f59e0b 40%, #d97706 60%, #b45309 80%, #78350f 100%)",
  },
  ocean_deep: {
    primary: "#0284c7",
    secondary: "#06b6d4",
    tertiary: "#22d3ee",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #075985 20%, #0369a1 40%, #0284c7 60%, #06b6d4 80%, #22d3ee 100%)",
  },
}

interface ThemeSwitcherProps {
  studentId?: string
}

export function ThemeSwitcher({ studentId }: ThemeSwitcherProps) {
  const [currentTheme, setCurrentTheme] = useState("beige_default")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [ownedThemes, setOwnedThemes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      loadActiveTheme()
      loadOwnedThemes()
    }
  }, [studentId])

  const loadActiveTheme = async () => {
    if (!studentId) return

    try {
      console.log("[v0] Loading active theme for student:", studentId)
      const response = await fetch(`/api/themes?studentId=${studentId}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (data.theme) {
        console.log("[v0] Active theme loaded from database:", data.theme)
        setCurrentTheme(data.theme)
      } else {
        console.log("[v0] No theme found, using default: beige_default")
        setCurrentTheme("beige_default")
      }
    } catch (error) {
      console.error("[v0] Error loading active theme:", error)
      setCurrentTheme("beige_default")
    } finally {
      setIsLoading(false)
    }
  }

  const loadOwnedThemes = async () => {
    if (!studentId) return

    // Always start from localStorage cache
    const cached: string[] = JSON.parse(localStorage.getItem(`purchases_${studentId}`) || '[]')
    try {
      const response = await fetch(`/api/purchases?student_id=${studentId}`)
      const data = await response.json()
      const dbPurchases: string[] = Array.isArray(data.purchases) ? data.purchases : []
      // Merge DB + cache so neither erases the other
      const merged = [...new Set([...cached, ...dbPurchases])]
      localStorage.setItem(`purchases_${studentId}`, JSON.stringify(merged))
      const themes = merged
        .filter((id: string) => id.startsWith("theme_"))
        .map((id: string) => id.replace("theme_", ""))
      setOwnedThemes([...new Set(["beige_default", ...themes])] as string[])
    } catch (error) {
      console.error("[v0] Error loading purchases from API, falling back to cache:", error)
      const themes = cached
        .filter((id: string) => id.startsWith("theme_"))
        .map((id: string) => id.replace("theme_", ""))
      setOwnedThemes([...new Set(["beige_default", ...themes])])
    }
  }

  const handleThemeChange = async (themeName: string) => {
    if (!ownedThemes.includes(themeName)) {
      console.log("[v0] Theme not owned:", themeName)
      return
    }

    if (!studentId) {
      setSaveMessage("خطأ: معرف الطالب غير موجود")
      return
    }

    setSaving(true)
    setSaveMessage("جاري الحفظ...")

    try {
      console.log("[v0] Saving theme:", themeName, "for student:", studentId)

      const response = await fetch("/api/themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          theme: themeName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("[v0] Theme saved successfully")
        setCurrentTheme(themeName)
        window.dispatchEvent(new CustomEvent("themeChanged", { detail: { studentId, theme: themeName } }))
        setSaveMessage("")
      } else {
        console.error("[v0] Error saving theme:", data.error)
        setSaveMessage("❌ خطأ في حفظ المظهر")
        setTimeout(() => setSaveMessage(""), 3000)
      }
    } catch (error) {
      console.error("[v0] Error saving theme:", error)
      setSaveMessage("❌ خطأ في الاتصال بالخادم")
      setTimeout(() => setSaveMessage(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  const renderThemePreview = (key: string) => {
    const theme = THEMES[key as keyof typeof THEMES]
    const isPremium = ["dawn", "galaxy", "sunset_gold", "ocean_deep"].includes(key)

    return (
      <ThemeRankPreview
        primary={theme.primary}
        secondary={theme.secondary}
        tertiary={theme.tertiary}
        premium={isPremium}
        circleAlign="end"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 md:w-6 md:h-6 text-[#3453a7]" />
          <h3 className="text-lg md:text-xl font-bold text-[#1a2332]">اختر المظهر</h3>
        </div>
        <div className="flex justify-center py-4">
          <SiteLoader size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Palette className="w-5 h-5 md:w-6 md:h-6 text-[#3453a7]" />
          <h3 className="text-lg md:text-xl font-bold text-[#1a2332]">اختر المظهر</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {Object.entries(THEMES).map(([key]) => {
          const isOwned = ownedThemes.includes(key)
          const isActive = currentTheme === key

          return (
            <button
              key={key}
              onClick={() => handleThemeChange(key)}
              disabled={!isOwned || saving}
              className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
                isOwned
                  ? isActive
                    ? "border-3 border-[#22C55E] shadow-xl scale-105"
                    : "border-3 border-[#3453a7] shadow-lg hover:shadow-2xl hover:scale-105 hover:-translate-y-1"
                  : "border-3 border-gray-300 bg-gray-50/50 cursor-not-allowed opacity-60"
              }`}
            >
              {isOwned && (
                <>
                  {/* Top-left corner - circular accent */}
                  <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden z-10">
                    <div
                      className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-lg ${isActive ? "border-[#22C55E]" : "border-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute top-1 left-1 w-3 h-3 rounded-full animate-pulse ${isActive ? "bg-[#22C55E]" : "bg-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-2xl ${isActive ? "border-[#22C55E]/20" : "border-[#3453a7]/20"}`}
                    ></div>
                  </div>

                  {/* Top-right corner - triangular accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden z-10">
                    <div
                      className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-lg ${isActive ? "border-[#22C55E]" : "border-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute top-2 right-2 w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent ${isActive ? "border-t-[#22C55E]" : "border-t-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-2xl ${isActive ? "border-[#22C55E]/20" : "border-[#3453a7]/20"}`}
                    ></div>
                  </div>

                  {/* Bottom-left corner - square accent */}
                  <div className="absolute bottom-0 left-0 w-16 h-16 overflow-hidden z-10">
                    <div
                      className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-lg ${isActive ? "border-[#22C55E]" : "border-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute bottom-2 left-2 w-3 h-3 rotate-45 ${isActive ? "bg-[#22C55E]/60" : "bg-[#3453a7]/60"}`}
                    ></div>
                    <div
                      className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-2xl ${isActive ? "border-[#22C55E]/20" : "border-[#3453a7]/20"}`}
                    ></div>
                  </div>

                  {/* Bottom-right corner - diamond accent */}
                  <div className="absolute bottom-0 right-0 w-16 h-16 overflow-hidden z-10">
                    <div
                      className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-lg ${isActive ? "border-[#22C55E]" : "border-[#3453a7]"}`}
                    ></div>
                    <div
                      className={`absolute bottom-3 right-3 w-3 h-3 rotate-45 animate-pulse ${isActive ? "bg-[#22C55E]" : "bg-[#3453a7]"}`}
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div
                      className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-2xl ${isActive ? "border-[#22C55E]/20" : "border-[#3453a7]/20"}`}
                    ></div>
                  </div>
                </>
              )}

              {/* Active checkmark indicator */}
              {isOwned && isActive && (
                <div className="absolute top-4 right-4 z-20 bg-[#22C55E] rounded-full p-2 shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Theme preview */}
              <div className="p-4">{renderThemePreview(key)}</div>

              {/* Locked overlay for unowned themes */}
              {!isOwned && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl z-10">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔒</div>
                    <span className="text-sm text-gray-600 font-semibold">مقفل</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {saveMessage && (
        <p
          className={`text-sm md:text-base text-center mt-4 ${saveMessage.includes("❌") ? "text-red-600" : "text-[#3453a7]"}`}
        >
          {saveMessage}
        </p>
      )}

    </div>
  )
}
