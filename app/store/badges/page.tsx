"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, Check, Star, Diamond, Zap, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const BADGES = [
  {
    id: "badge_diamond",
    name: "الماسة",
    description: "شارة الماسة الزرقاء الرائعة تظهر بجانب اسمك في لائحة الترتيب",
    price: 800,
    icon: "diamond",
    color: "#60a5fa",
    gradient: "from-blue-400 via-cyan-400 to-sky-300",
  },
  {
    id: "badge_star",
    name: "النجمة",
    description: "شارة النجمة الذهبية المتألقة تظهر بجانب اسمك في لائحة الترتيب",
    price: 800,
    icon: "star",
    color: "#fbbf24",
    gradient: "from-yellow-400 via-amber-400 to-orange-400",
  },
  {
    id: "badge_lightning",
    name: "البرق",
    description: "شارة البرق البنفسجي القوي تظهر بجانب اسمك في لائحة الترتيب",
    price: 800,
    icon: "lightning",
    color: "#a78bfa",
    gradient: "from-purple-400 via-violet-400 to-indigo-400",
  },
  {
    id: "badge_crown",
    name: "التاج",
    description: "شارة التاج الملكي الفاخر تظهر بجانب اسمك في لائحة الترتيب",
    price: 2000,
    icon: "crown",
    color: "#fbbf24",
    gradient: "from-yellow-400 via-amber-400 to-yellow-500",
  },
]

export default function BadgesPage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<string[]>([])
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
      }
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPurchases = async (studentId: string) => {
    const cached: string[] = JSON.parse(localStorage.getItem(`purchases_${studentId}`) || '[]')
    try {
      const response = await fetch(`/api/purchases?student_id=${studentId}`)
      const data = await response.json()
      const dbPurchases: string[] = Array.isArray(data.purchases) ? data.purchases : []
      const merged = [...new Set([...cached, ...dbPurchases])]
      setPurchases(merged)
      localStorage.setItem(`purchases_${studentId}`, JSON.stringify(merged))
    } catch (error) {
      console.error("[v0] Error fetching purchases:", error)
      setPurchases(cached)
    }
  }

  const handlePurchase = async (product: (typeof BADGES)[0]) => {
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
        const result = await response.json()
        const newPurchases = [...purchases, product.id]
        setPurchases(newPurchases)
        localStorage.setItem(`purchases_${studentId}`, JSON.stringify(newPurchases))
        setStudentPoints(result.remaining_points ?? (studentPoints - product.price))

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

  const getBadgeIcon = (iconType: string) => {
    switch (iconType) {
      case "diamond":
        return <Diamond className="w-6 h-6 text-white" />
      case "star":
        return <Star className="w-6 h-6 text-white fill-white" />
      case "lightning":
        return <Zap className="w-6 h-6 text-white fill-white" />
      case "crown":
        return <Crown className="w-6 h-6 text-white" />
      default:
        return <Star className="w-6 h-6 text-white fill-white" />
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

          <h1 className="text-4xl font-bold text-[#1a2332] mb-4">الشارات</h1>
          <p className="text-gray-600 mb-12 text-lg">أضف شارة مميزة تظهر بجانب اسمك في الترتيب</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BADGES.map((product) => {
              const isOwned = purchases.includes(product.id)
              const canAfford = studentPoints >= product.price

              return (
                <Card key={product.id} className={isOwned ? "ring-2 ring-[#3453a7] shadow-xl" : "shadow-lg"}>
                  {isOwned && (
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-[#3453a7] text-white flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        مملوك
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative">
                        <div
                          className={`absolute inset-0 blur-lg bg-gradient-to-br ${product.gradient} opacity-40 rounded-full`}
                        />
                        <div className={`relative p-2 rounded-full bg-gradient-to-br ${product.gradient}`}>
                          {getBadgeIcon(product.icon)}
                        </div>
                      </div>
                      <CardTitle className="text-xl text-[#1a2332]">{product.name}</CardTitle>
                    </div>
                    <CardDescription className="text-base">{product.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-[#3453a7]" />
                        <span className="text-2xl font-bold text-[#1a2332]">{product.price}</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(product)}
                        disabled={isOwned || !canAfford}
                        className={
                          isOwned
                            ? "bg-gray-300 cursor-not-allowed"
                            : canAfford
                              ? "bg-[#3453a7] hover:bg-[#4f73d1]"
                              : "bg-gray-300 cursor-not-allowed"
                        }
                      >
                        {isOwned ? "مملوك" : canAfford ? "شراء" : "غير كافي"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
