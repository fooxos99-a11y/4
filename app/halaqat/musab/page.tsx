"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { SiteLoader } from "@/components/ui/site-loader"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Award, Calendar, Star, MonitorPlay, X} from "lucide-react"
import { useEffect, useState } from "react"
import { getLockedLeaderboardTheme, isLockedLeaderboardRank } from "@/lib/leaderboard-rank-theme"

interface Student {
  id: string
  name: string
  rank: number
  badges?: string[]
  points: number
  preferred_theme?: string // Added preferred_theme field
}

const renderBadge = (badgeType: string) => {
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

const getThemeColors = (preferredTheme?: string) => {
  console.log("[v0] Getting theme colors for:", preferredTheme || "beige (default)")

  const themeMap: Record<string, { primary: string; secondary: string; tertiary: string }> = {
    beige: { primary: "#C9A86A", secondary: "#D4AF6A", tertiary: "#B89858" },
    ocean: { primary: "#0EA5E9", secondary: "#0284C7", tertiary: "#0284C7" },
    sunset: { primary: "#F97316", secondary: "#EA580C", tertiary: "#EA580C" },
    forest: { primary: "#22C55E", secondary: "#16A34A", tertiary: "#16A34A" },
    purple: { primary: "#A855F7", secondary: "#9333EA", tertiary: "#9333EA" },
  }

  return themeMap[preferredTheme || "beige"] || themeMap.beige
}

const isForestTheme = (theme?: string) => theme === "forest"

const ForestLeaves = () => (
  <>
    {/* ورقة شجر علوية يسار */}
    <div className="absolute -top-2 -left-2 w-8 h-8 opacity-30 pointer-events-none">
      <svg viewBox="0 0 24 24" fill="#22C55E">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* ورقة شجر سفلية يمين */}
    <div className="absolute -bottom-3 -right-3 w-16 h-16 opacity-25 pointer-events-none rotate-45">
      <svg viewBox="0 0 24 24" fill="#16A34A">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* ورقة صغيرة وسط */}
    <div className="absolute top-1/2 right-4 w-8 h-8 opacity-20 pointer-events-none -rotate-12">
      <svg viewBox="0 0 24 24" fill="#22C55E">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* تأثير ورق الشجر */}
    <div className="relative w-32 h-20 overflow-hidden">
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(240, 253, 244, 1), rgba(220, 252, 231, 1))",
        }}
      >
        {[
          { top: "14%", right: "16%", size: "17px", delay: "0s", animation: "leaf-float" },
          { top: "24%", left: "34%", size: "15px", delay: "0.6s", animation: "leaf-drift" },
          { top: "46%", left: "46%", size: "19px", delay: "1.2s", center: true, animation: "leaf-sway" },
          { bottom: "16%", left: "24%", size: "13px", delay: "1.8s", animation: "leaf-float" },
          { bottom: "26%", right: "26%", size: "21px", delay: "2.4s", animation: "leaf-drift" },
        ].map((leaf, i) => (
          <div
            key={i}
            className={`absolute animate-${leaf.animation}`}
            style={{
              ...(leaf.center
                ? { top: leaf.top, left: leaf.left, transform: "translate(-50%, -50%)" }
                : { top: leaf.top, right: leaf.right, left: leaf.left, bottom: leaf.bottom }),
              fontSize: leaf.size,
              animationDelay: leaf.delay,
              filter: "hue-rotate(0deg) saturate(1.3)",
            }}
          >
            🍃
          </div>
        ))}
      </div>
    </div>
  </>
)

export default function MusabHalaqahPage() {
  const [topStudents, setTopStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

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
    const fetchStudents = async () => {
      try {
        const [studentsRes, themesRes] = await Promise.all([
          fetch("/api/students?circle=مصعب بن عمير"),
          fetch("/api/themes"),
        ])

        let themes: Record<string, string> = {}
        if (themesRes.ok) {
          const themesData = await themesRes.json()
          themes = themesData.themes || {}
          console.log("[v0] Themes loaded:", themes)
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json()
          const studentsWithThemes = data.students.map((student: Student) => ({
            ...student,
            preferred_theme: themes[student.id] || "beige",
          }))

          const sorted = studentsWithThemes
            .sort((a: Student, b: Student) => (b.points || 0) - (a.points || 0))
            .slice(0, 10)

          console.log("[v0] Students with themes:", sorted)
          setTopStudents(sorted)
        }
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

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
            <h1 className="text-4xl font-bold text-[#20335f] mb-4">حلقة مصعب بن عمير</h1>
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

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
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
                حلقة مصعب بن عمير
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
              <div className="grid grid-cols-1 gap-3 md:gap-6">
                {topStudents.map((student, index) => {
                  const isLockedRank = isLockedLeaderboardRank(index)
                  const themeColors = isLockedRank ? getLockedLeaderboardTheme(index) : getThemeColors(student.preferred_theme)
                  const isForest = !isLockedRank && isForestTheme(student.preferred_theme)

                  return (
                    <div
                      key={student.id}
                      className={`group relative rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70 ${
                        isForest ? "shadow-[0_8px_30px_rgba(34,197,94,0.3)]" : ""
                      }`}
                      style={{
                        backgroundColor: isForest ? "#f0fdf4" : `${themeColors.primary}10`,
                        borderColor: isForest ? "#22C55E" : `${themeColors.primary}50`,
                        ...(isForest && {
                          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(34,197,94,0.08) 0%, transparent 50%),
                                           radial-gradient(circle at 80% 20%, rgba(22,163,74,0.06) 0%, transparent 50%)`,
                        }),
                      }}
                    >
                      <div
                        className={`absolute top-0 left-0 w-full h-2 ${isForest ? "h-3" : ""}`}
                        style={{
                          backgroundImage: isForest
                            ? `linear-gradient(to right, #22C55E 0%, #16A34A 25%, #22C55E 50%, #16A34A 75%, #22C55E 100%)`
                            : `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary}, ${themeColors.primary})`,
                        }}
                      />

                      {isForest && <ForestLeaves />}

                      <div className="relative z-10 grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-x-2 p-3 sm:grid-cols-[56px_minmax(0,1fr)_88px] sm:gap-4 sm:p-4 md:grid-cols-[84px_minmax(0,1fr)_132px] md:gap-5 md:p-6">
                        <div className="flex items-center justify-center sm:justify-start">
                          <div
                            className="relative flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${themeColors.secondary}, ${themeColors.primary})`,
                              borderColor: `${themeColors.tertiary}66`,
                            }}
                          >
                            <div className="absolute inset-[4px] rounded-full border border-white/25" />
                            <div className="absolute h-2 w-2 rounded-full bg-white/30 top-2.5 right-2.5" />
                            <div className="text-center text-white">
                              <div className="text-xl font-black leading-none md:text-2xl">{index + 1}</div>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 text-right">
                          <h3
                            className={`truncate text-sm sm:text-lg md:text-3xl font-black tracking-tight transition-colors duration-300 ${
                              isForest ? "text-[#166534] group-hover:text-[#14532d]" : "text-[#12312f] group-hover:text-[#1f4b47]"
                            }`}
                          >
                            {student.name}
                          </h3>
                          <div className="mt-2 flex flex-wrap justify-start gap-1 md:mt-3 md:gap-2">
                            {student.badges?.map((badge, idx) => (
                              <div key={idx} className="scale-90 md:scale-100">{renderBadge(badge)}</div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div
                            className="min-w-[76px] rounded-[18px] border bg-white/90 px-2.5 py-2 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] backdrop-blur sm:min-w-[88px] sm:px-3.5 sm:py-2.5 md:min-w-[104px] md:rounded-[22px] md:px-4 md:py-3"
                            style={{ borderColor: isForest ? "#22C55E" : `${themeColors.primary}88` }}
                          >
                            <div className={`text-lg font-black leading-none sm:text-xl md:text-3xl ${isForest ? "text-[#166534]" : "text-[#12312f]"}`}>
                              {student.points || 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isForest ? (
                        <>
                          <div
                            className="absolute bottom-0 right-0 w-32 h-32 rounded-tl-full opacity-10"
                            style={{
                              background: `radial-gradient(circle at bottom right, #22C55E, #16A34A, transparent)`,
                            }}
                          />
                          <div
                            className="absolute top-0 left-0 w-24 h-24 rounded-br-full opacity-10"
                            style={{
                              background: `radial-gradient(circle at top left, #16A34A, #22C55E, transparent)`,
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <div
                            className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-15"
                            style={{
                              background: `linear-gradient(to top left, ${themeColors.tertiary}, transparent)`,
                            }}
                          />
                          <div
                            className="absolute top-0 left-0 w-16 h-16 rounded-br-full opacity-10"
                            style={{
                              background: `linear-gradient(to bottom right, ${themeColors.secondary}, transparent)`,
                            }}
                          />
                        </>
                      )}
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
    </div>
  )
}
