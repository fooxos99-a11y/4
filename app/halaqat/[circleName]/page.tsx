"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { SiteLoader } from "@/components/ui/site-loader"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Award, Calendar, Diamond, Star, Zap, Crown, MonitorPlay, X} from "lucide-react"
import { applyCardEffect } from "@/lib/card-effects"
import { getDefaultLeaderboardTheme, getLeaderboardCrownTheme, isLockedLeaderboardRank } from "@/lib/leaderboard-rank-theme"

interface Student {
  id: string
  name: string
  rank: number
  points: number
  halaqah: string
  badges?: string[]
  preferred_theme?: string
  active_effect?: string
  font_family?: string
}

const renderBadge = (badgeType: string) => {
  // Check if it's a star badge
  if (badgeType.startsWith("star_")) {
    let starColor = "#3453a7"
    let starGradient = "from-amber-500 to-yellow-500"

    if (badgeType === "star_fire") {
      starColor = "#f97316"
      starGradient = "from-orange-600 via-red-500 to-pink-600"
    } else if (badgeType === "star_snow") {
      starColor = "#38bdf8"
      starGradient = "from-blue-400 via-cyan-400 to-sky-300"
    } else if (badgeType === "star_leaves") {
      starColor = "#22c55e"
      starGradient = "from-green-600 via-emerald-500 to-teal-400"
    } else if (badgeType === "star_bats") {
      starColor = "#8B7355"
      starGradient = "from-amber-800 via-amber-700 to-yellow-700"
    } else if (badgeType === "star_royal") {
      starColor = "#9333ea"
      starGradient = "from-purple-600 via-fuchsia-500 to-pink-500"
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-transparent border-0 p-0 hover:scale-110 transition-transform duration-200 cursor-help">
            <div className="relative">
              <div className={`absolute inset-0 blur-md bg-gradient-to-br ${starGradient} opacity-60 rounded-full`} />
              <Star
                className="w-8 h-8 relative"
                style={{
                  fill: `url(#star-gradient-${badgeType})`,
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
                }}
              />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id={`star-gradient-${badgeType}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={starColor} stopOpacity="1" />
                    <stop offset="50%" stopColor={starColor} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={starColor} stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-center">
            <p className="font-bold mb-1">نجمة مميزة</p>
            <p className="text-xs">نجمة تم شراؤها من المتجر</p>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  const unifiedBadgeClass =
    "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-0 p-3 rounded-full hover:scale-110 transition-transform duration-200 cursor-help shadow-md"

  switch (badgeType) {
    case "memorization":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Award className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الحفظ</p>
              <p className="text-xs">تُمنح للطلاب المتميزين في حفظ القرآن الكريم</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    case "mastery":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Star className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الإتقان</p>
              <p className="text-xs">تُمنح للطلاب المتقنين للتلاوة والتجويد</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    case "attendance":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Calendar className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الحضور</p>
              <p className="text-xs">تُمنح للطلاب المواظبين على الحضور</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    default:
      return null
  }
}

const LeaderboardCrown = ({ index }: { index: number }) => {
  const crownTheme = getLeaderboardCrownTheme(index)
  if (!crownTheme) {
    return null
  }

  const gradientId = `leaderboard-crown-gradient-${index}`
  const jewelId = `leaderboard-crown-jewel-${index}`
  const shineId = `leaderboard-crown-shine-${index}`

  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[86%] md:-translate-y-[92%]">
      <div className="leaderboard-crown-float relative">
        <div
          className="absolute left-1/2 top-[60%] h-6 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md"
          style={{ backgroundColor: crownTheme.glow }}
        />
        <svg
          viewBox="0 0 64 48"
          className="relative h-10 w-10 md:h-11 md:w-11"
          style={{ filter: `drop-shadow(0 4px 10px ${crownTheme.glow})` }}
          aria-hidden="true"
        >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={crownTheme.primary} />
            <stop offset="55%" stopColor={crownTheme.primary} />
            <stop offset="100%" stopColor={crownTheme.secondary} />
          </linearGradient>
          <radialGradient id={jewelId} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={crownTheme.border} stopOpacity="0.35" />
          </radialGradient>
          <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M10 39 L14 16 L25 27 L32 8 L39 27 L50 16 L54 39 Z"
          fill={`url(#${gradientId})`}
          stroke={crownTheme.border}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <rect
          x="12"
          y="37"
          width="40"
          height="7"
          rx="3.5"
          fill={`url(#${gradientId})`}
          stroke={crownTheme.border}
          strokeWidth="2.1"
        />
        <circle cx="14" cy="16" r="3.2" fill={`url(#${jewelId})`} stroke={crownTheme.border} strokeWidth="1.5" />
        <circle cx="32" cy="8" r="3.6" fill={`url(#${jewelId})`} stroke={crownTheme.border} strokeWidth="1.5" />
        <circle cx="50" cy="16" r="3.2" fill={`url(#${jewelId})`} stroke={crownTheme.border} strokeWidth="1.5" />
        <path d="M14 38 L23 15" stroke={`url(#${shineId})`} strokeWidth="3.1" strokeLinecap="round" />
        <path d="M28 41 L37 10" stroke={`url(#${shineId})`} strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

const getThemeColors = (preferredTheme?: string) => {
  if (preferredTheme === "bats") {
    return { primary: "#000000", secondary: "#1a1a1a", tertiary: "#2a2a2a" }
  }

  if (preferredTheme === "fire") {
    return { primary: "#ea580c", secondary: "#dc2626", tertiary: "#b91c1c" }
  }

  if (preferredTheme === "snow") {
    return { primary: "#0284c7", secondary: "#0369a1", tertiary: "#0c4a6e" }
  }

  if (preferredTheme === "leaves") {
    return { primary: "#22c55e", secondary: "#16a34a", tertiary: "#15803d" }
  }

  if (preferredTheme === "royal") {
    return { primary: "#3453a7", secondary: "#4f73d1", tertiary: "#20335f" }
  }

  // المظاهر الفاخرة الجديدة
  if (preferredTheme === "dawn") {
    return { primary: "#fbbf24", secondary: "#f97316", tertiary: "#d97706" }
  }

  if (preferredTheme === "galaxy") {
    return { primary: "#7c3aed", secondary: "#a78bfa", tertiary: "#c4b5fd" }
  }

  if (preferredTheme === "sunset_gold") {
    return { primary: "#f59e0b", secondary: "#d97706", tertiary: "#b45309" }
  }

  if (preferredTheme === "ocean_deep") {
    return { primary: "#0284c7", secondary: "#06b6d4", tertiary: "#22d3ee" }
  }

  // Default beige theme
  return { primary: "#b89858", secondary: "#d4af6a", tertiary: "#8f6b3b" }
}

const getThemeType = (theme?: string) => "default"

const ThemeDecorations = ({ theme }: { theme?: string }) => {
  // المظاهر الفاخرة التي تحتاج زخارف خاصة
  const premiumThemes = ["dawn", "galaxy", "sunset_gold", "ocean_deep"]

  if (!theme || !premiumThemes.includes(theme)) {
    return null
  }

  return (
    <>
      {/* النقاط المتلألئة */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: 0.3,
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* الخطوط القطرية */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`lines-${theme}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="20" y2="20" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#lines-${theme})`} />
      </svg>

      {/* الدوائر الزخرفية */}
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white opacity-30 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full border-2 border-white opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-4 h-4 rounded-full bg-white opacity-20 pointer-events-none" />

      <div className="absolute inset-2 rounded-2xl pointer-events-none overflow-hidden">
        {/* الحدود بسمك صغير */}
        <div className="absolute inset-0 border border-white/40 rounded-2xl" />

        {/* الدوائر في الزوايا الأربع */}
        <div className="absolute top-0 right-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute top-0 left-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 rounded-full border border-white/50" />
      </div>

      {/* أنيميشن التلألؤ */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </>
  )
}

const getFontFamily = (fontId?: string) => {
  const fontMap: Record<string, string> = {
    font_cairo: "'Cairo', sans-serif",
    font_amiri: "'Amiri', serif",
    font_tajawal: "'Tajawal', sans-serif",
    font_changa: "'Changa', sans-serif",
  }
  return fontId && fontMap[fontId] ? fontMap[fontId] : "inherit"
}

export default function CircleLeaderboard() {
  const params = useParams()
  const circleName = decodeURIComponent(params.circleName as string)
  const [topStudents, setTopStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [studentBadges, setStudentBadges] = useState<Record<string, string>>({})

    useEffect(() => {
    if (!isAutoScrolling) return;
    let animationFrameId: number;
    let scrollDirection = 1; let currentY = window.scrollY;

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      // Reverse direction at top or bottom
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1;
      } else if (scrollTop <= 0) {
        scrollDirection = 1;
      }
      
      currentY += scrollDirection * 0.3; window.scrollTo(0, currentY);
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling]);

  useEffect(() => {
    fetchStudents()

    const handleStorageChange = () => {
      fetchStudents()
    }

    const handleThemeChange = () => {
      console.log("[v0] Theme changed, refreshing students")
      fetchStudents()
    }

    const handleFontChange = () => {
      console.log("[v0] Font changed, refreshing students")
      fetchStudents()
    }

    const handleEffectChange = () => {
      console.log("[v0] Effect changed, refreshing students")
      fetchStudents()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("themeChanged", handleThemeChange)
    window.addEventListener("fontChanged", handleFontChange)
    window.addEventListener("effectChanged", handleEffectChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("themeChanged", handleThemeChange)
      window.removeEventListener("fontChanged", handleFontChange)
      window.removeEventListener("effectChanged", handleEffectChange)
    }
  }, [circleName])

  const fetchStudents = async () => {
    try {
      console.log("[v0] Fetching students and themes")

      const [studentsRes, themesRes, badgesRes, fontsRes] = await Promise.all([
        fetch(`/api/students?circle=${encodeURIComponent(circleName)}`, { cache: "no-store" }),
        fetch("/api/themes"),
        fetch("/api/badges"),
        fetch("/api/fonts"),
      ])

      let themes: Record<string, string> = {}
      if (themesRes.ok) {
        const themesData = await themesRes.json()
        themes = themesData.themes || {}
        console.log("[v0] Loaded themes from server:", themes)
      }

      let badges: Record<string, string> = {}
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json()
        badges = badgesData.badges || {}
        setStudentBadges(badges)
        console.log("[v0] Loaded badges from server:", badges)
      }

      let fonts: Record<string, string> = {}
      if (fontsRes.ok) {
        const fontsData = await fontsRes.json()
        fonts = fontsData.fonts || {}
        console.log("[v0] Loaded fonts from server:", fonts)
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json()
        if (data.students) {
          const studentsWithData = data.students.map((student: Student) => {
            const activeEffectKey = localStorage.getItem(`active_effect_${student.id}`)
            const activeEffect = activeEffectKey && activeEffectKey !== "none" ? `effect_${activeEffectKey}` : null

            const studentTheme = themes[student.id] || "default"
            const studentFont = fonts[student.id]
            console.log(`[v0] Student ${student.name} theme: ${studentTheme}, font: ${studentFont}`)

            return {
              ...student,
              preferred_theme: studentTheme,
              active_effect: activeEffect,
              font_family: studentFont,
            }
          })

          const sorted = studentsWithData
            .sort((a: Student, b: Student) => (b.points || 0) - (a.points || 0))

          setTopStudents(sorted.slice(0, 10))
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBadgeIcon = (studentId: string) => {
    const badgeId = studentBadges[studentId]
    if (!badgeId || badgeId === "badge_none") return null

    const badgeData: Record<string, { color: string; gradient: string; icon: string }> = {
      badge_diamond: {
        color: "#60a5fa",
        gradient: "from-blue-400 via-cyan-400 to-sky-300",
        icon: "diamond",
      },
      badge_star: {
        color: "#fbbf24",
        gradient: "from-yellow-400 via-amber-400 to-orange-400",
        icon: "star",
      },
      badge_lightning: {
        color: "#a78bfa",
        gradient: "from-purple-400 via-violet-400 to-indigo-400",
        icon: "lightning",
      },
      badge_crown: {
        color: "#fbbf24",
        gradient: "from-yellow-400 via-amber-400 to-yellow-600",
        icon: "crown",
      },
    }

    const badge = badgeData[badgeId]
    if (!badge) return null

    const getBadgeIconComponent = () => {
      switch (badge.icon) {
        case "diamond":
          return (
            <Diamond
              className="w-8 h-8"
              style={{ color: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "star":
          return (
            <Star
              className="w-8 h-8"
              style={{ color: badge.color, fill: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "lightning":
          return (
            <Zap
              className="w-8 h-8"
              style={{ color: badge.color, fill: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "crown":
          return (
            <Crown
              className="w-8 h-8"
              style={{ color: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        default:
          return null
      }
    }

    return (
      <div>
        <div className={`bg-gradient-to-br ${badge.gradient} opacity-60 rounded-full inline-block`} />
        <div className="inline-block animate-pulse" style={{ animationDuration: "3s" }}>
          {getBadgeIconComponent()}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {!isAutoScrolling && <Header />}
        <main className="flex-1 flex items-center justify-center">
          <SiteLoader size="lg" />
        </main>
        <Footer />
      </div>
    )
  }

  if (topStudents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {!isAutoScrolling && <Header />}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">{circleName}</h1>
            <p className="text-xl text-gray-600">لا يوجد طلاب مسجلين في هذه الحلقة حالياً</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!isAutoScrolling && <Header />}

      <main className="flex-1 py-8 md:py-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center mb-8 md:mb-16">
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#3453a7]" />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[#3453a7] animate-pulse"
                style={{ animationDuration: "2s" }}
              />
              <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#3453a7]" />
            </div>

            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#3453a7]/5 blur-3xl rounded-full" />
              <h1 className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-[#20335f] px-3 sm:px-4 md:px-6 py-2 leading-tight break-words">
                {circleName}
              </h1>
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-4 mt-4 md:mt-6">
              <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#3453a7]" />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[#3453a7] animate-pulse"
                style={{ animationDuration: "2s", animationDelay: "1s" }}
              />
              <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#3453a7]" />
            </div>
          </div>

          <TooltipProvider>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {topStudents.map((student, index) => {
                  const isLockedRank = isLockedLeaderboardRank(index)
                  const crownTheme = getLeaderboardCrownTheme(index)
                  const themeColors = getDefaultLeaderboardTheme()
                  const rankNumberColor = "#ffffff"

                  const cardEffect = applyCardEffect(
                    student.active_effect,
                    "group relative rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70",
                  )

                  const isPremiumTheme = false

                  return (
                    <div key={student.id}>
                      <div
                        className={cardEffect.className}
                        style={{
                          ...(isPremiumTheme
                            ? {
                                backgroundColor: "rgba(245, 245, 240, 0.95)",
                                borderColor: themeColors.primary,
                                borderWidth: "3px",
                                backgroundImage: `
                                  linear-gradient(90deg, ${themeColors.primary}08 1px, transparent 1px),
                                  linear-gradient(${themeColors.primary}08 1px, transparent 1px),
                                  radial-gradient(circle at 10% 20%, ${themeColors.primary}05 0%, transparent 50%)
                                `,
                                backgroundSize: "20px 20px, 20px 20px, 100% 100%",
                              }
                            : {
                              backgroundColor: "rgba(255, 255, 255, 0.96)",
                              borderColor: `${themeColors.primary}`,
                                backgroundImage: `radial-gradient(circle at 20% 80%, ${themeColors.primary}08 0%, transparent 50%),
                                                  radial-gradient(circle at 80% 20%, ${themeColors.secondary}06 0%, transparent 50%)`,
                              }),
                          ...cardEffect.style,
                        }}
                      >
                        {cardEffect.extraElements}

                        {isPremiumTheme && <ThemeDecorations theme={student.preferred_theme} />}

                        <div
                          className="absolute top-0 left-0 w-full h-1.5 md:h-2"
                          style={{
                            backgroundImage: isPremiumTheme
                              ? `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary}, ${themeColors.primary})`
                              : `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
                          }}
                        />

                        <div className="relative z-10 grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-x-2 p-3 sm:grid-cols-[56px_minmax(0,1fr)_88px] sm:gap-4 sm:p-4 md:grid-cols-[84px_minmax(0,1fr)_132px] md:gap-5 md:p-6">
                          <div className="flex items-center justify-center sm:justify-start">
                            <div className="leaderboard-rank-bob mt-4 md:mt-5">
                              <div
                                className="relative flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16"
                                style={{
                                  background: `radial-gradient(circle at 30% 30%, ${themeColors.secondary}, ${themeColors.primary})`,
                                  borderColor: `${themeColors.tertiary}66`,
                                }}
                              >
                                {crownTheme && <LeaderboardCrown index={index} />}
                                <div className="absolute inset-[4px] rounded-full border border-white/25" />
                                <div className="absolute h-2 w-2 rounded-full bg-white/30 top-2.5 right-2.5" />
                                <div className="text-center" style={{ color: rankNumberColor }}>
                                  <div className="text-xl font-black leading-none md:text-2xl">{index + 1}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 text-right sm:text-right">
                            <div className="flex items-center justify-start gap-1.5 sm:gap-2 md:gap-3">
                              <h3
                                className="truncate text-sm sm:text-lg md:text-3xl font-black tracking-tight text-[#20335f] transition-colors duration-300 group-hover:text-[#3453a7]"
                                style={{ fontFamily: getFontFamily(student.font_family) }}
                              >
                                {student.name}
                              </h3>
                              {getBadgeIcon(student.id) && (
                                <div className="flex-shrink-0 scale-90 md:scale-100">
                                  {getBadgeIcon(student.id)}
                                </div>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap justify-start gap-1 md:mt-3 md:gap-2">
                              {student.badges?.map((badge, idx) => (
                                <div key={idx} className="scale-90 md:scale-100">
                                  {renderBadge(badge)}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <div
                              className="min-w-[76px] rounded-[18px] border bg-white/90 px-2.5 py-2 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] backdrop-blur sm:min-w-[88px] sm:px-3.5 sm:py-2.5 md:min-w-[104px] md:rounded-[22px] md:px-4 md:py-3"
                              style={{ borderColor: `${themeColors.primary}88` }}
                            >
                              <div className="text-lg font-black leading-none text-[#20335f] sm:text-xl md:text-3xl">
                                {student.points || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </main>

            <button
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={`fixed bottom-6 left-6 w-8 h-8 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${
          isAutoScrolling 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "bg-[#3453a7] hover:bg-[#4f73d1] text-white opacity-50 hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف العرض" : "شاشة عرض"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling && <Footer />}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;700&family=Changa:wght@400;700&display=swap");

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fly {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-8px) translateX(4px);
          }
          50% {
            transform: translateY(-4px) translateX(-4px);
          }
          75% {
            transform: translateY(-10px) translateX(2px);
          }
        }
        @keyframes sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.8;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.98);
          }
        }
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes glow {
          0%,
          100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.7;
            filter: brightness(1.3);
          }
        }
        @keyframes wave {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.8;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.98);
          }
        }
        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-30px);
          }
          60% {
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  )
}
