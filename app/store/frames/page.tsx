"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const FRAMES = [
  {
    id: "frame_bat",
    name: "إطار الخفافيش",
    description: "إطار أسود مع ثلاث خفافيش متحركة",
    price: 5000,
    preview: (
      <div className="relative w-48 h-32 mx-auto overflow-hidden">
        {/* Main frame rectangle */}
        <div className="absolute inset-0 rounded-2xl border-8 border-black bg-gray-900/10" />

        <div className="absolute top-2 left-2 w-14 h-14 text-black animate-[fly_3s_ease-in-out_infinite]">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        <div className="absolute top-2 right-2 w-14 h-14 text-black animate-[fly_3.5s_ease-in-out_infinite_0.5s]">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 text-black animate-[fly_4s_ease-in-out_infinite_1s]">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">1000</span>
        </div>
      </div>
    ),
  },
]

export default function FramesPage() {
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
      console.error("Error fetching student data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPurchases = async (studentId: string) => {
    const cached: string[] = JSON.parse(localStorage.getItem(`frame_purchases_${studentId}`) || '[]')
    try {
      const response = await fetch(`/api/purchases?student_id=${studentId}`)
      const data = await response.json()
      const dbPurchases: string[] = Array.isArray(data.purchases)
        ? data.purchases.filter((id: string) => id.startsWith('frame_'))
        : []
      const merged = [...new Set([...cached, ...dbPurchases])]
      setPurchases(merged)
      localStorage.setItem(`frame_purchases_${studentId}`, JSON.stringify(merged))
    } catch (error) {
      console.error("Error fetching purchases:", error)
      setPurchases(cached)
    }
  }

  const handlePurchase = async (frameId: string, framePrice: number) => {
    if (!studentId) {
      toast({
        title: "خطأ",
        description: "معرف الطالب غير موجود",
        variant: "destructive",
      })
      return
    }

    if (studentPoints < framePrice) {
      toast({
        title: "نقاط غير كافية",
        description: `تحتاج إلى ${framePrice - studentPoints} نقطة إضافية`,
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, product_id: frameId, price: framePrice }),
      })

      if (response.ok) {
        const result = await response.json()
        setStudentPoints(result.remaining_points)
        const updatedPurchases = [...purchases, frameId]
        setPurchases(updatedPurchases)
        localStorage.setItem(`frame_purchases_${studentId}`, JSON.stringify(updatedPurchases))
        toast({
          title: "تم الشراء بنجاح!",
          description: "تم إضافة الإطار إلى ملفك الشخصي",
        })
      } else {
        const err = await response.json()
        toast({ title: "خطأ", description: err.error || "حدث خطأ أثناء الشراء", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error purchasing frame:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الشراء",
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

          <h1 className="text-4xl font-bold text-[#1a2332] mb-4">الإطارات</h1>
          <p className="text-gray-600 mb-12 text-lg">اختر إطاراً فريداً لبطاقتك في لائحة الترتيب</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FRAMES.map((frame) => {
              const isPurchased = purchases.includes(frame.id)
              const canAfford = studentPoints >= frame.price

              return (
                <div
                  key={frame.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="mb-6">{frame.preview}</div>

                  <h3 className="text-xl font-bold text-[#1a2332] mb-2 text-center">{frame.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 text-center">{frame.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-[#3453a7]">{frame.price}</span>
                    <span className="text-sm text-gray-600">نقطة</span>
                  </div>

                  <button
                    onClick={() => handlePurchase(frame.id, frame.price)}
                    disabled={isPurchased || !canAfford}
                    className={`w-full py-3 rounded-lg font-bold transition-colors ${
                      isPurchased
                        ? "bg-green-500 text-white cursor-default"
                        : canAfford
                          ? "bg-[#3453a7] hover:bg-[#4f73d1] text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isPurchased ? "✓ تم الشراء" : canAfford ? "شراء" : "نقاط غير كافية"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes fly {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-8px) translateX(4px); }
          50% { transform: translateY(-4px) translateX(-4px); }
          75% { transform: translateY(-10px) translateX(2px); }
        }
      `}</style>
    </div>
  )
}
