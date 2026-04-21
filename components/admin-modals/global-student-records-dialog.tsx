
"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"

export function GlobalStudentRecordsDialog() {
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<any[]>([])
  const [studentsInCircles, setStudentsInCircles] = useState<Record<string, any[]>>({})
  
  const [selectedCircle, setSelectedCircle] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  
  const [records, setRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [circlesRes, studentsRes] = await Promise.all([
        fetch("/api/circles", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ])

      const circlesData = await circlesRes.json()
      const studentsData = await studentsRes.json()

      if (circlesRes.ok && circlesData.circles) setCircles(circlesData.circles)
      if (studentsRes.ok && studentsData.students) {
        const grouped: Record<string, any[]> = {}
        studentsData.students.forEach((s: any) => {
          const circleName = s.halaqah || s.circle_name;
          if (circleName) {
            if (!grouped[circleName]) grouped[circleName] = []
            grouped[circleName].push(s)
          }
        })
        setStudentsInCircles(grouped)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentRecords(selectedStudent)
    } else {
      setRecords([])
    }
  }, [selectedStudent])

  const fetchStudentRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const res = await fetch(`/api/attendance?student_id=${studentId}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data && data.records && Array.isArray(data.records)) {
        setRecords(data.records)
      } else {
        setRecords(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error(error)
      setRecords([])
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => {
        router.push(window.location.pathname)
      }, 300)
    }
  }

  const getStatusBadge = (status: string, isCompensation?: boolean) => {
    if (isCompensation) {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />نجح بتعويض</span>;
    }

    switch (status) {
      case "present":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />حضور</span>;
      case "absent":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200"><XCircle className="w-3.5 h-3.5" />غياب</span>;
      case "excused":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"><AlertCircle className="w-3.5 h-3.5" />مستأذن</span>;
      case "late":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200"><Clock className="w-3.5 h-3.5" />متأخر</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">{status}</span>;
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "excellent": return <span className="text-emerald-600 font-medium">ممتاز</span>;
      case "very_good": return <span className="text-blue-600 font-medium">جيد جدا</span>;
      case "good": return <span className="text-amber-600 font-medium">جيد</span>;
      case "not_completed": return <span className="text-gray-400">-</span>;
      default: return <span className="text-gray-400">-</span>;
    }
  }

  const formatReadingRange = (fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null) => {
    if (!fromSurah || !fromVerse || !toSurah || !toVerse) return null
    return `${fromSurah} ${fromVerse} - ${toSurah} ${toVerse}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[92vw] md:max-w-[980px] w-full min-h-[60vh] max-h-[88vh] flex flex-col bg-white rounded-2xl p-0 overflow-hidden [&::-webkit-scrollbar]:hidden" dir="rtl">
        <DialogHeader className="px-5 py-4 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right shrink-0">
          <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
            <FileText className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
            <span>سجلات الطلاب</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 pr-10 mt-1">
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-neutral-600">الحلقة</Label>
              <Select value={selectedCircle} onValueChange={(val) => { setSelectedCircle(val); setSelectedStudent(""); setRecords([]); }}>
                <SelectTrigger className="w-full text-sm rounded-xl border-[#3453a7]/40 h-10">
                  <SelectValue placeholder="اختر الحلقة" />
                </SelectTrigger>
                <SelectContent>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-neutral-600">الطالب</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedCircle}>
                <SelectTrigger className="w-full text-sm rounded-xl border-[#3453a7]/40 h-10">
                  <SelectValue placeholder={!selectedCircle ? "اختر الحلقة أولا" : "اختر الطالب"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCircle && studentsInCircles[selectedCircle]?.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStudent && (
            <div className="border border-[#3453a7]/20 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-white px-4 py-2.5 border-b border-[#3453a7]/10 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#3453a7]" />
                <h3 className="font-semibold text-sm text-[#1a2332]">سجل التقييمات والحضور</h3>
              </div>
              
              <div className="max-h-[56vh] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:hidden px-3 py-2">
                {isLoadingRecords ? (
                  <div className="flex justify-center items-center py-10">
                    <SiteLoader size="sm" />
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-sm">
                    لا توجد سجلات سابقة لهذا الطالب
                  </div>
                ) : (
                  <table className="mx-auto w-full min-w-[640px] table-auto text-right text-sm">
                    <thead className="bg-white text-[#1a2332] sticky top-0 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-[#3453a7]/20">
                      <tr>
                        <th className="px-3 py-2 font-medium whitespace-nowrap">التاريخ</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap text-center">الحالة</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap text-center">حفظ</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap text-center">تكرار</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap text-center">مراجعة</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap text-center">ربط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3453a7]/10 text-neutral-600">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-white transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap text-xs tabular-nums text-neutral-800">{new Date(record.date).toLocaleDateString("en-GB")}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center">{getStatusBadge(record.status, record.is_compensation)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center text-xs">
                            <div className="flex flex-col items-center gap-0.5">
                              {getLevelLabel(record.hafiz_level)}
                              {formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse) && (
                                <span className="text-[10px] leading-4 text-neutral-500">{formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center text-xs">{getLevelLabel(record.tikrar_level)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center text-xs">
                            <div className="flex flex-col items-center gap-0.5">
                              {getLevelLabel(record.samaa_level)}
                              {formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse) && (
                                <span className="text-[10px] leading-4 text-neutral-500">{formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse)}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center text-xs">
                            <div className="flex flex-col items-center gap-0.5">
                              {getLevelLabel(record.rabet_level)}
                              {formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse) && (
                                <span className="text-[10px] leading-4 text-neutral-500">{formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse)}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

