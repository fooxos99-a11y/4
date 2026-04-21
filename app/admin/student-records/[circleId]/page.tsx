"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface Student {
  id: string
  name: string
  points: number
  halaqah: string
}

export default function CircleAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب")

  if (authLoading || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

    // تحديث بيانات الطلاب
    const fetchStudents = async (circleName: string) => {
      try {
        const studentsResponse = await fetch(`/api/students?circle=${encodeURIComponent(circleName)}`)
        const studentsData = await studentsResponse.json()
        const allStudents = (studentsData.students || []).sort((a: any, b: any) => b.points - a.points)
        setStudents(allStudents)
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
      }
    }
  const router = useRouter()
  const params = useParams()
  const circleId = params.circleId as string
  const [circleName, setCircleName] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAttendance, setShowAttendance] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const circleResponse = await fetch("/api/circles")
        const circleData = await circleResponse.json()
        const circle = circleData.circles?.find((c: any) => c.id === circleId)
        if (circle) {
          setCircleName(circle.name)
          await fetchStudents(circle.name)
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // إعادة تحميل البيانات عند العودة للصفحة (focus)
    const handleFocus = () => {
      if (circleName) fetchStudents(circleName)
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [circleId, circleName])

  const handleDateSubmit = () => {
    if (selectedDate) {
      setShowAttendance(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => fetchStudents(circleName)} variant="outline" className="border-2 border-[#3453a7]">
              تحديث السجلات
            </Button>
          </div>
          <Button
            onClick={() => router.push("/admin/student-records")}
            variant="outline"
            className="mb-6 border-2 border-[#3453a7] hover:bg-[#f5f1e8]"
          >
            <ArrowRight className="w-5 h-5 ml-2" />
            العودة للحلقات
          </Button>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">{circleName || "الحلقة"}</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <SiteLoader />
            </div>
          ) : students.length === 0 ? (
            <Card className="border-2 border-[#3453a7]">
              <CardContent className="p-6 sm:p-12 text-center">
                <p className="text-xl text-gray-600">لا يوجد طلاب في هذه الحلقة</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="max-w-5xl mx-auto mb-12">
                <p className="text-xl font-semibold text-[#1a2332] mb-6 text-center">جميع الطلاب</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      className="group relative bg-gradient-to-br from-[#C9A86A]/10 via-[#D4AF6A]/5 to-[#C9A86A]/10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-[#C9A86A]/30 hover:border-[#C9A86A]/50"
                    >
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#C9A86A] via-[#D4AF6A] to-[#C9A86A]" />
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-[#3453a7]">#{index + 1}</span>
                          <div className="flex flex-col items-center bg-gradient-to-br from-[#C9A86A]/20 via-[#D4AF6A]/15 to-[#C9A86A]/20 rounded-lg px-4 py-2 border border-[#C9A86A]/40">
                            <div className="text-2xl font-bold text-[#20335f]">{student.points}</div>
                            <div className="text-xs text-gray-600 font-bold">نقطة</div>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#20335f] text-center">{student.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
