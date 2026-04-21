"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Download, Calendar, BookOpen } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { translateAttendanceStatus } from "@/lib/student-attendance"

interface Circle {
  name: string
  studentCount: number
}

interface StudentReport {
  id: string
  name: string
  attendance_status: string
  hafiz_level: string
  tikrar_level: string
  samaa_level: string
  rabet_level: string
}

export default function StudentReportsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب");

  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [studentReports, setStudentReports] = useState<StudentReport[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchCircles()
    }
  }, [router])

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      if (data.circles) {
        setCircles(data.circles)
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getLevelDisplay = (level: string | null): string => {
    if (!level || level === "not_completed" || level === "null") {
      return "لم يكمل"
    }
    switch (level) {
      case "excellent":
        return "ممتاز"
      case "very_good":
        return "جيد جداً"
      case "good":
        return "جيد"
      default:
        return level
    }
  }

  const fetchStudentReports = async (date: string, circle: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/attendance-by-date?date=${date}&circle=${encodeURIComponent(circle)}`)
      const data = await response.json()

      if (data.records && Array.isArray(data.records)) {
        const reports: StudentReport[] = data.records.map((record: any) => ({
          id: `${record.student_id}-${record.date}-${record.is_compensation ? "comp" : "main"}`,
          name: record.student_name,
          attendance_status: record.is_compensation ? "نجح بتعويض" : (translateAttendanceStatus(record.status) || "—"),
          hafiz_level: getLevelDisplay(record.hafiz_level),
          tikrar_level: getLevelDisplay(record.tikrar_level),
          samaa_level: getLevelDisplay(record.samaa_level),
          rabet_level: getLevelDisplay(record.rabet_level),
        }))
        setStudentReports(reports)
      } else {
        setStudentReports([])
      }
    } catch (error) {
      console.error("[v0] Error fetching student reports:", error)
      setStudentReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    if (selectedCircle) {
      fetchStudentReports(date, selectedCircle)
    }
  }

  const handleCircleSelect = async (circleName: string) => {
    setSelectedCircle(circleName)
    setStudentReports([])
    fetchStudentReports(new Date().toISOString().split("T")[0], circleName)
  }

  useEffect(() => {
    if (!selectedCircle || !selectedDate) return

    const interval = setInterval(() => {
      fetchStudentReports(selectedDate, selectedCircle)
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedCircle, selectedDate])

  const downloadReport = () => {
    if (studentReports.length === 0) return

    const csv = [
      ["اسم الطالب", "حالة الحضور", "الحفظ", "التكرار", "المراجعة", "الربط"],
      ...studentReports.map((r) => [
        r.name,
        r.attendance_status,
        r.hafiz_level,
        r.tikrar_level,
        r.samaa_level,
        r.rabet_level,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_${selectedCircle}_${selectedDate}.csv`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white" dir="rtl">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center gap-4">
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              className="border-2 border-[#3453a7]"
            >
              <ArrowRight className="w-5 h-5 ml-2" />
              العودة
            </Button>
            <h1 className="text-4xl font-bold text-[#1a2332]">تقارير الطلاب</h1>
          </div>

          {!selectedCircle ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#1a2332] mb-4">اختر الحلقة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {circles.map((circle) => (
                  <Card
                    key={circle.name}
                    className="border-2 border-[#3453a7]/20 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-[#3453a7]"
                    onClick={() => handleCircleSelect(circle.name)}
                  >
                    <CardContent className="pt-6 p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-6 h-6 text-[#3453a7]" />
                          <h3 className="text-xl font-bold text-[#1a2332]">{circle.name}</h3>
                        </div>
                        <p className="text-sm text-[#1a2332]/70">
                          عدد الطلاب: <span className="font-bold">{circle.studentCount}</span>
                        </p>
                        <Button className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#BFA050] text-[#20335f] font-bold">
                          <Calendar className="w-4 h-4 ml-2" />
                          دخول
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {circles.length === 0 && (
                <Card className="border-2 border-[#3453a7]">
                  <CardContent className="p-6 sm:p-12 text-center">
                    <BookOpen className="w-16 h-16 text-[#1a2332]/20 mx-auto mb-4" />
                    <p className="text-xl text-gray-600">لا توجد حلقات</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <>
              {/* Back to circles button */}
              <Button
                onClick={() => {
                  setSelectedCircle(null)
                  setStudentReports([])
                }}
                variant="outline"
                className="border-2 border-[#3453a7] mb-6"
              >
                <ArrowRight className="w-5 h-5 ml-2" />
                اختر حلقة أخرى
              </Button>

              <Card className="border-2 border-[#3453a7] mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#1a2332]">{selectedCircle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2 text-[#1a2332]">التاريخ</label>
                      <div className="relative flex items-center">
                        <Calendar className="absolute right-3 w-5 h-5 text-[#3453a7] pointer-events-none" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border-2 border-[#3453a7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3453a7]"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {studentReports.length > 0 && (
                <Card className="border-2 border-[#3453a7]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl text-[#1a2332]">تقارير الطلاب - {selectedDate}</CardTitle>
                    <Button
                      onClick={downloadReport}
                      className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-[#20335f] font-bold"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تحميل التقرير
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f5f1e8] border-b-2 border-[#3453a7]">
                            <TableHead className="text-right font-bold text-[#1a2332]">اسم الطالب</TableHead>
                            <TableHead className="text-center font-bold text-[#1a2332]">حالة الحضور</TableHead>
                            <TableHead className="text-center font-bold text-[#1a2332]">الحفظ</TableHead>
                            <TableHead className="text-center font-bold text-[#1a2332]">التكرار</TableHead>
                            <TableHead className="text-center font-bold text-[#1a2332]">المراجعة</TableHead>
                            <TableHead className="text-center font-bold text-[#1a2332]">الربط</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentReports.map((report, index) => (
                            <TableRow key={report.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f9f7f3]"}>
                              <TableCell className="font-semibold text-[#1a2332]">{report.name}</TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`px-3 py-1 rounded-full font-bold text-white ${
                                    report.attendance_status === "حاضر"
                                      ? "bg-green-600"
                                      : report.attendance_status === "متأخر"
                                        ? "bg-orange-600"
                                      : report.attendance_status === "نجح بتعويض"
                                        ? "bg-emerald-700"
                                      : report.attendance_status === "غائب"
                                        ? "bg-red-600"
                                        : "bg-yellow-600"
                                  }`}
                                >
                                  {report.attendance_status}
                                </span>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-[#1a2332]">
                                {report.hafiz_level}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-[#1a2332]">
                                {report.tikrar_level}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-[#1a2332]">
                                {report.samaa_level}
                              </TableCell>
                              <TableCell className="text-center font-semibold text-[#1a2332]">
                                {report.rabet_level}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!loading && selectedDate && studentReports.length === 0 && (
                <Card className="border-2 border-[#3453a7]">
                  <CardContent className="p-6 sm:p-12 text-center">
                    <p className="text-xl text-gray-600">لا توجد بيانات للتاريخ المختار</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
