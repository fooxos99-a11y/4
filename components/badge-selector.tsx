"use client"

import { useEffect, useState } from "react"
import { Diamond, Star, Zap, Crown } from "lucide-react"

interface BadgeSelectorProps {
  studentId: string
}

const BADGES = [
  {
    id: "badge_none",
    name: "بدون شارة",
    icon: "none",
    color: "#9ca3af",
    gradient: "from-gray-400 to-gray-500",
  },
  {
    id: "badge_diamond",
    name: "الماسة",
    icon: "diamond",
    color: "#60a5fa",
    gradient: "from-blue-400 via-cyan-400 to-sky-300",
  },
  {
    id: "badge_star",
    name: "النجمة",
    icon: "star",
    color: "#fbbf24",
    gradient: "from-yellow-400 via-amber-400 to-orange-400",
  },
  {
    id: "badge_lightning",
    name: "البرق",
    icon: "lightning",
    color: "#a78bfa",
    gradient: "from-purple-400 via-violet-400 to-indigo-400",
  },
  {
    id: "badge_crown",
    name: "التاج",
    icon: "crown",
    color: "#fbbf24",
    gradient: "from-yellow-400 via-amber-400 to-yellow-600",
  },
]

export function BadgeSelector({ studentId }: BadgeSelectorProps) {
  const [activeBadge, setActiveBadge] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [purchases, setPurchases] = useState<string[]>([])

  useEffect(() => {
    fetchActiveBadge()
    fetchPurchases()
  }, [studentId])

  const fetchActiveBadge = async () => {
    try {
      const response = await fetch(`/api/badges?studentId=${studentId}&t=${Date.now()}`, {
        cache: "no-store",
      })
      const data = await response.json()
      console.log("[v0] Loaded active badge:", data.badge)
      setActiveBadge(data.badge || null)
    } catch (error) {
      console.error("Error fetching badge:", error)
    }
  }

  const fetchPurchases = async () => {
    const cached: string[] = JSON.parse(localStorage.getItem(`purchases_${studentId}`) || '[]')
    try {
      const response = await fetch(`/api/purchases?student_id=${studentId}`)
      const data = await response.json()
      const dbPurchases: string[] = Array.isArray(data.purchases) ? data.purchases : []
      const merged = [...new Set([...cached, ...dbPurchases])]
      setPurchases(merged)
      localStorage.setItem(`purchases_${studentId}`, JSON.stringify(merged))
    } catch (error) {
      console.error("Error fetching purchases:", error)
      setPurchases(cached)
    }
  }

  const handleBadgeSelect = async (badgeId: string) => {
    if (badgeId !== "badge_none" && !purchases.includes(badgeId)) {
      return
    }

    setIsLoading(true)
    try {
      console.log("[v0] Saving badge:", badgeId)
      const response = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, badge: badgeId }),
      })
      const data = await response.json()
      console.log("[v0] Badge saved successfully:", data)

      setActiveBadge(badgeId)

      setTimeout(() => {
        fetchActiveBadge()
      }, 1000)
    } catch (error) {
      console.error("Error saving badge:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBadgeIcon = (iconType: string, size = "w-8 h-8") => {
    switch (iconType) {
      case "diamond":
        return <Diamond className={`${size} text-white relative z-10 drop-shadow-lg`} />
      case "star":
        return <Star className={`${size} text-white fill-white relative z-10 drop-shadow-lg`} />
      case "lightning":
        return <Zap className={`${size} text-white fill-white relative z-10 drop-shadow-lg`} />
      case "crown":
        return <Crown className={`${size} text-white relative z-10 drop-shadow-lg`} />
      default:
        return <div className={`${size} text-white relative z-10`}>✕</div>
    }
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-[#1a2332] mb-4">الشارات</h3>
      <p className="text-sm text-[#1a2332]/60 mb-4">اختر شارة تظهر بجانب اسمك في لائحة الترتيب</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {BADGES.filter((badge) => badge.id === "badge_none" || purchases.includes(badge.id)).map((badge) => {
          const isActive = activeBadge === badge.id
          return (
            <button
              key={badge.id}
              onClick={() => handleBadgeSelect(badge.id)}
              disabled={isLoading}
              className={`relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                isActive
                  ? "border-[#3453a7] shadow-lg bg-gradient-to-br from-[#3453a7]/10 to-transparent"
                  : "border-gray-200 hover:border-[#3453a7]/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`relative p-3 rounded-full bg-gradient-to-br ${badge.gradient}`}>
                  <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />
                  {getBadgeIcon(badge.icon)}
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1a2332]">{badge.name}</p>
                </div>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-[#3453a7] flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isLoading && <div className="mt-4 text-center text-sm text-[#3453a7]">جاري الحفظ...</div>}
    </div>
  )
}
