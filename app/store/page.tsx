"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ThemeRankPreview } from "@/components/theme-rank-preview"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { ShoppingBag, Palette } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"

const THEME_EMOJI: Record<string, string> = {
  bats: '🦇', fire: '🔥', snow: '❄️', leaves: '🍃',
  royal: '👑', dawn: '🌅', galaxy: '🌌', sunset_gold: '🌟', ocean_deep: '🌊',
}
const THEME_COLORS: Record<string, { primary: string; secondary: string; tertiary: string }> = {
  beige_default:{ primary: '#3453a7', secondary: '#4f73d1', tertiary: '#20335f' },
  bats:        { primary: '#000000', secondary: '#1a1a1a', tertiary: '#2a2a2a' },
  fire:        { primary: '#ea580c', secondary: '#dc2626', tertiary: '#b91c1c' },
  snow:        { primary: '#0284c7', secondary: '#0369a1', tertiary: '#0c4a6e' },
  leaves:      { primary: '#22c55e', secondary: '#16a34a', tertiary: '#15803d' },
  royal:       { primary: '#3453a7', secondary: '#4f73d1', tertiary: '#20335f' },
  dawn:        { primary: '#fbbf24', secondary: '#f97316', tertiary: '#dc2626' },
  galaxy:      { primary: '#7c3aed', secondary: '#a78bfa', tertiary: '#c4b5fd' },
  sunset_gold: { primary: '#f59e0b', secondary: '#d97706', tertiary: '#b45309' },
  ocean_deep:  { primary: '#0284c7', secondary: '#06b6d4', tertiary: '#22d3ee' },
}

function StarCoinIcon({ size = 96, className = "" }: { size?: number; className?: string }) {
  const sparklePath = "M50 24 L56.5 39 L72 45 L56.5 51 L50 66 L43.5 51 L28 45 L43.5 39 Z"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="coinOuter" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(34 24) rotate(45) scale(70)">
          <stop offset="0" stopColor="#FFF8C9" />
          <stop offset="0.46" stopColor="#FFD85A" />
          <stop offset="1" stopColor="#E59B00" />
        </radialGradient>
        <linearGradient id="coinInner" x1="22" y1="16" x2="82" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="0.48" stopColor="#F0BC21" />
          <stop offset="1" stopColor="#D88C00" />
        </linearGradient>
        <linearGradient id="coinRim" x1="15" y1="12" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFBE2" />
          <stop offset="0.52" stopColor="#F9D85A" />
          <stop offset="1" stopColor="#EAA61B" />
        </linearGradient>
        <linearGradient id="sparkleFill" x1="34" y1="24" x2="64" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFDF4" />
          <stop offset="0.54" stopColor="#FFF1A5" />
          <stop offset="1" stopColor="#F4C93E" />
        </linearGradient>
        <filter id="coinShadow" x="2" y="4" width="96" height="96" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#9F5B00" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#coinShadow)">
        <circle cx="50" cy="50" r="45" fill="url(#coinOuter)" />
        <circle cx="50" cy="50" r="38" fill="url(#coinRim)" />
        <circle cx="50" cy="50" r="33" fill="url(#coinInner)" />

        <ellipse cx="40" cy="24" rx="18" ry="9" fill="#FFFBE1" opacity="0.34" />
        <path d="M18 21C27 15 37 12 49 12" stroke="#FFF4B5" strokeWidth="4" strokeLinecap="round" opacity="0.36" />
        <circle cx="50" cy="50" r="20" fill="#FFF5C8" opacity="0.18" />

        <g transform="translate(50 50) scale(0.9) translate(-50 -50)">
          <path d={sparklePath} fill="#B96F00" opacity="0.24" transform="translate(1.4 2.4)" />
          <path d={sparklePath} fill="url(#sparkleFill)" />
          <path d={sparklePath} stroke="#FFF8DA" strokeWidth="1.5" opacity="0.98" />
          <circle cx="50" cy="50" r="5.5" fill="#FFFBEA" opacity="0.94" />
          <path d="M50 17V27" stroke="#FFF8DA" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
          <path d="M50 63V73" stroke="#EABF30" strokeWidth="2.2" strokeLinecap="round" opacity="0.76" />
          <path d="M23 45H33" stroke="#FFF8DA" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
          <path d="M67 45H77" stroke="#EABF30" strokeWidth="2.2" strokeLinecap="round" opacity="0.76" />
        </g>
      </g>
    </svg>
  )
}

export default function StorePage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [ownedThemes, setOwnedThemes] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const role = localStorage.getItem("userRole")
    setUserRole(role)

    if (loggedIn && role === "student") {
      fetchStudentData()
      fetchStoreData()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line
  }, [])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      const response = await fetch(`/api/students?account_number=${accountNumber}`)
      const data = await response.json()
      const student = data.students?.[0]
      if (student) {
        setStudentPoints(student.store_points || 0)
        setStudentId(student.id)
        // تحميل المظاهر المشتراة من قاعدة البيانات (تتزامن عبر الأجهزة)
        try {
          const purchaseRes = await fetch(`/api/purchases?student_id=${student.id}`)
          const purchaseData = await purchaseRes.json()
          if (purchaseData.purchases) {
            const themes = (purchaseData.purchases as string[])
              .filter((p) => p.startsWith('theme_'))
              .map((p) => p.replace('theme_', ''))
            setOwnedThemes(themes)
            localStorage.setItem(`purchases_${student.id}`, JSON.stringify(purchaseData.purchases))
          }
        } catch {
          // Fallback to localStorage cache
          const key = `purchases_${student.id}`
          const purchases = JSON.parse(localStorage.getItem(key) || '[]')
          const themes = purchases
            .filter((p: string) => p.startsWith('theme_'))
            .map((p: string) => p.replace('theme_', ''))
          setOwnedThemes(themes)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
    }
  }

  const fetchStoreData = async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    const { data: productsData } = await supabase.from("store_products").select("*")
    const { data: categoriesData } = await supabase.from("store_categories").select("*")
    setProducts(productsData || [])
    setCategories(categoriesData || [])
    setIsLoading(false)
  }

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/store/${categoryId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (userRole !== "student") {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <ShoppingBag className="w-16 h-16 text-[#3453a7] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-[#1a2332] mb-2">يظهر للطلاب فقط</h2>
            <p className="text-lg text-gray-600">هذا القسم متاح للطلاب المسجلين فقط</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-[#3453a7]" />
              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المتجر</h1>
            </div>
          </div>

          {/* Points Card */}
          <div className="relative bg-gradient-to-br from-[#0f2f6d] via-[#1f4d9a] to-[#669ee8] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 text-white shadow-2xl overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#3453a7]/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#3453a7]/8 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-2 md:p-4 text-center">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div
                  className="shrink-0 translate-y-[1px] md:translate-y-[2px] drop-shadow-[0_4px_10px_rgba(216,163,85,0.16)]"
                  aria-hidden="true"
                >
                  <StarCoinIcon size={44} className="md:h-[52px] md:w-[52px] h-[44px] w-[44px]" />
                </div>

                <div
                  className="text-4xl sm:text-[2.8rem] md:text-6xl font-black leading-[0.9] tracking-[-0.03em]"
                  style={{ color: '#f5c96a', textShadow: '0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)' }}
                >
                  {studentPoints}
                </div>
              </div>
            </div>
          </div>

          {/* Products by Category */}
          <div className="space-y-14 mb-8 md:mb-16">
            {categories.length === 0 ? (
              <div className="text-center text-gray-400 py-16">لا توجد فئات متاحة حالياً</div>
            ) : (
              [...categories].sort((a, b) => {
                if (a.name === "المظاهر") return 1;
                if (b.name === "المظاهر") return -1;
                return 0;
              }).map((category) => {
                const categoryProducts = products
                  .filter((prod) => prod.category_id === category.id)
                  .sort((a, b) => {
                    const priceDiff = Number(a.price || 0) - Number(b.price || 0)
                    if (priceDiff !== 0) return priceDiff
                    return String(a.name || "").localeCompare(String(b.name || ""), "ar")
                  })
                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#3453a7]/30" />
                      <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#3453a7]/40 bg-white">
                        <ShoppingBag className="w-4 h-4 text-[#3453a7]" />
                        <h2 className="text-base md:text-lg font-bold text-[#1a2332]">{category.name}</h2>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#3453a7]/30" />
                    </div>

                    {categoryProducts.length === 0 ? (
                      <div className="text-center text-gray-300 py-8 text-sm">لا توجد منتجات في هذه الفئة</div>
                    ) : (
                      <div className="store-products-grid grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 sm:gap-4 xl:grid-cols-3 xl:gap-6">
                        {categoryProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] transition-all duration-200 hover:shadow-lg"
                            style={{
                              background: '#ffffff',
                              border: prod.theme_key ? '2px solid #3453a7' : '1px solid rgba(52,83,167,0.16)',
                            }}
                          >

                            {/* Image / Theme Preview */}
                            {prod.theme_key ? (() => {
                              const tc = THEME_COLORS[prod.theme_key] || { primary: '#b89858', secondary: '#d4af6a', tertiary: '#8f6b3b' }
                              const isPremium = ["dawn", "galaxy", "sunset_gold", "ocean_deep"].includes(prod.theme_key)
                              return (
                                <div className="p-2 sm:p-4 md:p-5">
                                  <ThemeRankPreview primary={tc.primary} secondary={tc.secondary} tertiary={tc.tertiary} premium={isPremium} />
                                </div>
                              )
                            })() : (
                              <div className="relative flex min-h-[10.5rem] w-full items-center justify-center bg-white p-3 sm:min-h-[13rem] md:h-56 md:p-5">
                                {prod.image_url ? (
                                  <img src={prod.image_url} alt={prod.name}
                                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <ShoppingBag className="w-16 h-16 text-gray-200" />
                                )}
                              </div>
                            )}

                            {/* Divider */}
                            <div className="mx-2.5 h-px bg-[#e7eef9] sm:mx-3" />

                            {/* Info */}
                            <div className={`flex flex-1 flex-col ${prod.theme_key ? "gap-2 p-2 sm:gap-2.5 sm:p-4" : "gap-2.5 p-3 sm:p-4"} md:gap-3 md:p-5`}>
                              {/* Name */}
                              {!prod.theme_key && (
                                <p className="h-10 text-sm font-semibold leading-snug text-[#1a2332] line-clamp-2 sm:h-12 sm:text-base md:h-14 md:text-lg">
                                  {prod.name}
                                </p>
                              )}

                              {/* Buy button */}
                              {prod.theme_key && ownedThemes.includes(prod.theme_key) ? (
                                <div
                                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-center select-none sm:py-3 sm:text-base md:text-lg"
                                  style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}
                                >
                                  <span>✓</span>
                                  <span>تم الشراء</span>
                                </div>
                              ) : (
                              <div className={`mt-1 ${prod.theme_key ? "space-y-2" : "space-y-3"}`}>
                                <div className="flex items-center justify-center rounded-[20px] border border-[#dce6f6] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-2.5 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)] sm:px-4 sm:py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <StarCoinIcon size={24} className="h-5 w-5 shrink-0 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                                    <span className="text-[1.3rem] font-black leading-none tracking-[-0.03em] text-[#20335f] [font-variant-numeric:tabular-nums] sm:text-[1.8rem] md:text-[2.55rem]">
                                      {prod.price}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  className="w-full rounded-xl py-2.5 text-sm font-black transition-all duration-150 active:scale-95 hover:opacity-90 sm:py-3 sm:text-base md:text-lg"
                                  style={{ background: 'linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)', color: '#ffffff' }}
                                  onClick={async () => {
                                    const accountNumber = localStorage.getItem("accountNumber")
                                    const studentsRes = await fetch(`/api/students?account_number=${accountNumber}`)
                                    const studentsData = await studentsRes.json()
                                    const student = studentsData.students?.[0]
                                    if (!student) {
                                      toast({ title: "خطأ", description: "لم يتم العثور على الطالب", variant: "destructive" })
                                      return
                                    }
                                    if ((student.store_points ?? 0) < prod.price) {
                                      toast({ title: "نقاط المتجر غير كافية", description: `لا تملك نقاط متجر كافية لشراء هذا المنتج`, variant: "destructive" })
                                      return
                                    }
                                    const res = await fetch("/api/store-orders", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        student_id: student.id,
                                        student_name: student.name,
                                        product_id: prod.id,
                                        product_name: prod.name,
                                        price: prod.price,
                                        theme_key: prod.theme_key,
                                      })
                                    })
                                    const data = await res.json()
                                    if (res.ok && data.success) {
                                      setStudentPoints(data.remaining_store_points)
                                      if (prod.theme_key && studentId) {
                                        const key = `purchases_${studentId}`
                                        const existing = JSON.parse(localStorage.getItem(key) || '[]')
                                        const themeEntry = `theme_${prod.theme_key}`
                                        if (!existing.includes(themeEntry)) {
                                          localStorage.setItem(key, JSON.stringify([...existing, themeEntry]))
                                        }
                                        setOwnedThemes(prev => [...new Set([...prev, prod.theme_key!])])
                                      }
                                      toast({ title: prod.theme_key ? "تم شراء المظهر بنجاح ✓ يمكنك تفعيله من ملفك الشخصي" : "تم الشراء بنجاح ✓" })
                                    } else {
                                      toast({ title: "فشل الشراء", description: data.error || "حدث خطأ غير متوقع", variant: "destructive" })
                                    }
                                  }}
                                >
                                  شراء الآن
                                </button>
                              </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="-mt-4 md:-mt-6 mb-4 md:mb-6 ml-auto w-full max-w-3xl rounded-xl border border-[#3453a7]/20 bg-[#faf9f6] px-4 py-4 text-right shadow-sm md:px-5">
            <div className="space-y-2 text-xs leading-7 text-[#4b5563] md:text-[15px] md:leading-8">
              <p className="text-right">• استخدم نقاطك المكتسبة من التقييم والأنشطة لشراء المنتجات</p>
              <p className="text-right">• نقاط ملفك الشخصي وترتيبك في اللائحة لا تتأثر بالشراء</p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
