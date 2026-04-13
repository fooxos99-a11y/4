"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getDefaultLeaderboardTheme, getLeaderboardCrownTheme, isLockedLeaderboardRank } from "@/lib/leaderboard-rank-theme"
import { Crown, MonitorPlay, X } from "lucide-react"

type StudentRow = {
  id: string
  points?: number | null
  halaqah?: string | null
}

type CircleRank = {
  name: string
  points: number
  students: number
}

function getCircleTheme(index: number) {
  return getDefaultLeaderboardTheme()
}

function LeaderboardCrown({ index }: { index: number }) {
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

export default function AllCirclesPage() {
  const [loading, setLoading] = useState(true)
  const [circles, setCircles] = useState<CircleRank[]>([])
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  useEffect(() => {
    if (!isAutoScrolling) {
      return
    }

    let animationFrameId: number
    let scrollDirection = 1
    let currentY = window.scrollY

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement

      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1
      } else if (scrollTop <= 0) {
        scrollDirection = 1
      }

      currentY += scrollDirection * 0.3
      window.scrollTo(0, currentY)
      animationFrameId = requestAnimationFrame(scrollStep)
    }

    animationFrameId = requestAnimationFrame(scrollStep)

    return () => cancelAnimationFrame(animationFrameId)
  }, [isAutoScrolling])

  useEffect(() => {
    async function fetchAllCircles() {
      try {
        const response = await fetch("/api/students", { cache: "no-store" })
        const data = await response.json()
        const students = (data.students ?? []) as StudentRow[]
        const circleTotals = new Map<string, CircleRank>()

        for (const student of students) {
          const circleName = student.halaqah?.trim()
          if (!circleName) {
            continue
          }

          const currentCircle = circleTotals.get(circleName) ?? {
            name: circleName,
            points: 0,
            students: 0,
          }

          currentCircle.points += Number(student.points ?? 0)
          currentCircle.students += 1
          circleTotals.set(circleName, currentCircle)
        }

        const rankedCircles = Array.from(circleTotals.values()).sort((left, right) => {
          if (right.points !== left.points) {
            return right.points - left.points
          }

          if (right.students !== left.students) {
            return right.students - left.students
          }

          return left.name.localeCompare(right.name, "ar")
        })

        setCircles(rankedCircles.slice(0, 10))
      } catch (error) {
        console.error("Error fetching all circles:", error)
        setCircles([])
      } finally {
        setLoading(false)
      }
    }

    void fetchAllCircles()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-[#20335f]">جاري التحميل...</div>
        </main>
        <Footer />
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">أفضل الحلقات</h1>
            <p className="text-xl text-gray-600">لا توجد حلقات تحتوي على نقاط حالياً</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      {!isAutoScrolling && <Header />}

      <main className="flex-1 py-8 md:py-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="text-center mb-8 md:mb-16">
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-[#3453a7]" />
              <div
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#3453a7] animate-pulse"
                style={{ animationDuration: "2s" }}
              />
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-[#3453a7]" />
            </div>

            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#3453a7]/5 blur-3xl rounded-full" />
              <h1 className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-[#20335f] px-3 sm:px-4 md:px-6 py-2 leading-tight">
                أفضل الحلقات
              </h1>
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-4 mt-4 md:mt-6">
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-[#3453a7]" />
              <div
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#3453a7] animate-pulse"
                style={{ animationDuration: "2s", animationDelay: "1s" }}
              />
              <div className="h-px w-12 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-[#3453a7]" />
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              {circles.map((circle, index) => {
                const themeColors = getCircleTheme(index)
                const crownTheme = getLeaderboardCrownTheme(index)
                const rankNumberColor = "#ffffff"

                return (
                  <Link key={circle.name} href={`/halaqat/${encodeURIComponent(circle.name)}`}>
                    <div
                      className="group relative rounded-2xl md:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderColor: themeColors.primary,
                        backgroundImage: `radial-gradient(circle at 20% 80%, ${themeColors.primary}08 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${themeColors.secondary}06 0%, transparent 50%)`,
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 w-full h-1.5 md:h-2"
                        style={{
                          backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
                        }}
                      />

                      <div className="relative z-10 grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-x-2 p-3 sm:grid-cols-[56px_minmax(0,1fr)_88px] sm:gap-4 sm:p-4 md:grid-cols-[84px_minmax(0,1fr)_132px] md:gap-5 md:p-6">
                        <div className="flex shrink-0 items-center justify-center sm:justify-start">
                          <div className="leaderboard-rank-bob mt-4 md:mt-5">
                            <div
                              className="relative flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, ${themeColors.secondary}, ${themeColors.primary})`,
                                borderColor: `${themeColors.tertiary}66`,
                              }}
                            >
                              {crownTheme && <LeaderboardCrown index={index} />}
                              <div className="absolute inset-[4px] rounded-full border border-white/25" />
                              <div className="absolute h-2 w-2 rounded-full bg-white/30 top-2.5 right-2.5" />
                              <div className="text-center" style={{ color: rankNumberColor }}>
                                <div className="text-lg font-black leading-none md:text-2xl">{index + 1}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 text-right">
                          <div className="flex min-h-[40px] items-center justify-start md:min-h-[58px]">
                            <h3 className="truncate text-sm font-extrabold leading-[1.35] tracking-normal text-[#20335f] antialiased transition-colors duration-300 group-hover:text-[#3453a7] sm:text-lg md:text-[2rem] md:text-right">
                              {circle.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex shrink-0 justify-end">
                          <div
                            className="min-w-[76px] rounded-[18px] border bg-white/90 px-2.5 py-2 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] backdrop-blur sm:min-w-[88px] sm:px-3.5 sm:py-2.5 md:min-w-[104px] md:rounded-[22px] md:px-4 md:py-3"
                            style={{ borderColor: `${themeColors.primary}88` }}
                          >
                            <div className="text-lg font-black leading-none text-[#20335f] sm:text-xl md:text-3xl">
                              {circle.points || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={`fixed bottom-6 left-6 w-8 h-8 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${
          isAutoScrolling
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-[#3453a7] hover:bg-[#4f73d1] text-white opacity-50 hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف النزول التلقائي" : "تشغيل النزول التلقائي (وضع شاشة العرض)"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling && <Footer />}
    </div>
  )
}