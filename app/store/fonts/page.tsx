// صفحة الخطوط
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, Check, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const FONTS = [
  {
    id: "font_cairo",
    name: "خط القاهرة",
    description: "خط عربي أنيق وواضح",
    price: 1500,
    fontFamily: "'Cairo', sans-serif",
    previewText: "خط القاهرة",
  },
  {
    id: "font_amiri",
    name: "خط الأميري",
    description: "خط عربي تقليدي فخم",
    price: 2000,
    fontFamily: "'Amiri', serif",
    previewText: "خط الأميري",
  },
  {
    id: "font_tajawal",
    name: "خط تجول",
    description: "خط عصري ومميز",
    price: 1800,
    fontFamily: "'Tajawal', sans-serif",
    previewText: "خط تجول",
  },
  {
    id: "font_changa",
    name: "خط تشانغا",
    description: "خط جريء وقوي",
    price: 2200,
    fontFamily: "'Changa', sans-serif",
    previewText: "خط تشانغا",
  },
]

export default function FontsPage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<string[]>([])
  const [activeFont, setActiveFont] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "student") {
      router.push("/login")
    } else {
      fetchStudentData()
    }
  }, [])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      const response = await fetch(`/api/students?account_number=${accountNumber}`)
      const data = await response.json()

      const student = data.students?.[0]

      if (student) {
        setStudentId(student.id)
        setStudentPoints(student.points || 0)
        await fetchPurchases(student.id)
        await fetchActiveFont(student.id)
      }
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPurchases = async (studentId: string) => {
    try {
      const purchases = localStorage.getItem(`purchases_${studentId}`)
      if (purchases) {
        setPurchases(JSON.parse(purchases))
      }
    } catch (error) {
      console.error("[v0] Error fetching purchases:", error)
    }
  }

  const fetchActiveFont = async (studentId: string) => {
    try {
      const response = await fetch(`/api/fonts?t=${Date.now()}`, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        const font = data.fonts?.[studentId]
        setActiveFont(font || null)
        console.log("[v0] Loaded active font:", font)
      }
    } catch (error) {
      console.error("[v0] Error fetching font:", error)
    }
  }

  const handlePurchase = async (product: (typeof FONTS)[0]) => {
    if (!studentId) return

    if (purchases.includes(product.id)) {
      toast({
        title: "تملك هذا المنتج",
        description: "لقد اشتريت هذا المنتج من قبل",
      })
      return
    }

    if (studentPoints < product.price) {
      toast({
        title: "نقاط غير كافية",
        description: `تحتاج ${product.price - studentPoints} نقطة إضافية`,
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          product_id: product.id,
          price: product.price,
        }),
      })

      if (response.ok) {
        const newPurchases = [...purchases, product.id]
        setPurchases(newPurchases)
        localStorage.setItem(`purchases_${studentId}`, JSON.stringify(newPurchases))
        setStudentPoints(studentPoints - product.price)

        toast({
          title: "تم الشراء بنجاح",
          description: `تم شراء ${product.name} بنجاح`,
        })
      }
    } catch (error) {
      console.error("[v0] Error purchasing:", error)
      toast({
        title: "خطأ",
        description: "فشل الشراء",
        variant: "destructive",
      })
    }
  }

  const handleActivateFont = async (fontId: string) => {
    if (!studentId) return

    if (!purchases.includes(fontId)) {
      toast({
        title: "لم تشتر هذا الخط",
        description: "يجب شراء الخط قبل استخدامه",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          font_id: fontId,
        }),
      })

      if (response.ok) {
        setActiveFont(fontId)
        // Wait for blob to update
        await new Promise((resolve) => setTimeout(resolve, 500))
        await fetchActiveFont(studentId)

        toast({
          title: "تم تفعيل الخط",
          description: "سيظهر الخط الجديد في أفضل الطلاب",
        })

        // Trigger refresh for other components
        window.dispatchEvent(new Event("fontChanged"))
      }
    } catch (error) {
      console.error("[v0] Error activating font:", error)
      toast({
        title: "خطأ",
        description: "فشل تفعيل الخط",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/store")}
            className="flex items-center gap-2 text-[#3453a7] hover:text-[#4f73d1] mb-8 font-semibold"
          >
            <ArrowRight className="w-5 h-5" />
            العودة للمتجر
          </button>

          <h1 className="text-4xl font-bold text-[#1a2332] mb-4">الخطوط</h1>
          <p className="text-gray-600 mb-12 text-lg">اختر خطاً مميزاً لعرض اسمك في لائحة الترتيب</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FONTS.map((product) => {
              const isOwned = purchases.includes(product.id)
              const isActive = activeFont === product.id
              const canAfford = studentPoints >= product.price

              return (
                <Card
                  key={product.id}
                  className={`${isActive ? "ring-4 ring-green-500 shadow-2xl" : isOwned ? "ring-2 ring-[#3453a7] shadow-xl" : "shadow-lg"} cursor-pointer transition-all duration-300 hover:shadow-2xl`}
                  onClick={() => isOwned && handleActivateFont(product.id)}
                >
                  {isActive && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-green-500 text-white flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        نشط
                      </Badge>
                    </div>
                  )}
                  {isOwned && !isActive && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-[#3453a7] text-white flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        مملوك
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-xl text-[#1a2332]">{product.name}</CardTitle>
                    <CardDescription className="text-base">{product.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                      <p className="text-center text-4xl" style={{ fontFamily: product.fontFamily }}>
                        {product.previewText}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-[#3453a7]" />
                        <span className="text-2xl font-bold text-[#1a2332]">{product.price}</span>
                      </div>
                      {!isOwned ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePurchase(product)
                          }}
                          disabled={!canAfford}
                          className={canAfford ? "bg-[#3453a7] hover:bg-[#4f73d1]" : "bg-gray-300 cursor-not-allowed"}
                        >
                          {canAfford ? "شراء" : "غير كافي"}
                        </Button>
                      ) : (
                        <div className="text-sm text-gray-600">{isActive ? "الخط النشط" : "اضغط للتفعيل"}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;700&family=Changa:wght@400;700&display=swap");
      `}</style>
    </div>
  )
}
