"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { SiteLoader } from "@/components/ui/site-loader"

export default function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [teacherData, setTeacherData] = useState<any>(null)
  const [myStudents, setMyStudents] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    const accountNumber = localStorage.getItem("accountNumber")

    if (!loggedIn || (userRole !== "teacher" && userRole !== "deputy_teacher")) {
      router.push("/login")
      return
    }

    void fetchTeacherData(accountNumber || "")
  }, [router])

  const fetchTeacherData = async (accountNumber: string) => {
    try {
      const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
      const data = await response.json()

      if (data.teachers && data.teachers.length > 0) {
        const teacher = data.teachers[0]
        setTeacherData(teacher)

        if (teacher.halaqah) {
          await fetchMyStudents(teacher.halaqah)
        }
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyStudents = async (halaqah: string) => {
    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
      const data = await response.json()

      if (data.students) {
        setMyStudents(data.students)
      }
    } catch (error) {
      console.error("Error fetching my students:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const teacherCircle = String(teacherData?.halaqah || "").trim()
  const hasAssignedCircle = teacherCircle.length > 0

  return (
    <>
      <Header />
      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-4 md:space-y-6">
            {!hasAssignedCircle ? (
              <Card className="border-2 border-amber-200 bg-amber-50/70 shadow-lg">
                <CardContent className="pt-4 md:pt-6 text-center text-sm md:text-base font-semibold text-amber-900">
                  لا توجد حلقة مرتبطة بهذا المعلم حاليًا.
                </CardContent>
              </Card>
            ) : null}
            <Card className="border-2 border-[#3453a7]/20 shadow-lg">
              <CardContent className="pt-4 md:pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">رقم الحساب</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.account_number || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">اسم المعلم</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.name || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">رقم الهوية</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.id_number || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">الحلقة</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherCircle || "بدون حلقة"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">عدد الطلاب في الحلقة</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {myStudents.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
