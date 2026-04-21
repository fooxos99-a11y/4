"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface Circle {
  id: string
  name: string
}

export default function StudentRecordsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب");

  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const response = await fetch("/api/circles")
        const data = await response.json()
        setCircles(data.circles || [])
      } catch (error) {
        console.error("Error fetching circles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCircles()
  }, [])

  const handleCircleClick = (circleId: string) => {
    router.push(`/admin/student-records/${circleId}`)
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white" dir="rtl">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1a2332] mb-2">سجلات الطلاب</h1>
            <p className="text-lg text-gray-600">اختر الحلقة لعرض أفضل 10 طلاب حسب النقاط</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="flex justify-center"><SiteLoader size="md" /></div>
            </div>
          ) : circles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">لا توجد حلقات متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {circles.map((circle) => (
                <Card
                  key={circle.id}
                  className="border-2 border-[#3453a7] hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <CardHeader className="bg-white text-[#1a2332] rounded-t-lg border-b-2 border-[#3453a7]/20">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-[#3453a7]" />
                      {circle.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Button
                        onClick={() => handleCircleClick(circle.id)}
                        className="w-full bg-[#3453a7] hover:bg-[#4f73d1] text-white font-bold py-3 text-lg"
                      >
                        عرض أفضل الطلاب
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
