"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Award, TrendingUp } from "lucide-react"

interface Circle {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  points?: number | null
  halaqah?: string | null
}

const getStudentCircleName = (student: Student) => (student.halaqah || "غير محدد").trim()

export function GlobalEditPointsDialog() {
  const router = useRouter()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<Circle[]>([])
  const [studentsInCircles, setStudentsInCircles] = useState<Record<string, Student[]>>({})
  
  const [selectedCircleForPoints, setSelectedCircleForPoints] = useState("")
  const [selectedStudentForPoints, setSelectedStudentForPoints] = useState("")
  
  const [editingStudentPoints, setEditingStudentPoints] = useState<Student | null>(null)
  const [newPoints, setNewPoints] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

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
      if (!studentsRes.ok) {
        console.error("Error fetching students for edit points:", studentsData.error)
      }

      if (studentsRes.ok && studentsData.students) {
        const grouped: Record<string, Student[]> = {}
        studentsData.students.forEach((student: Student) => {
          const circleKey = getStudentCircleName(student)
          if (!grouped[circleKey]) grouped[circleKey] = []
          grouped[circleKey].push(student)
        })
        setStudentsInCircles(grouped)
      }
    } catch (e) { console.error(e) }
  }

  const availableStudentsForPoints = selectedCircleForPoints ? studentsInCircles[selectedCircleForPoints.trim()] || [] : []

  const handleSelectStudentForPoints = (studentId: string) => {
    setSelectedStudentForPoints(studentId)
    const student = studentsInCircles[(selectedCircleForPoints || "").trim()]?.find((s) => s.id === studentId)
    if (student) {
      setEditingStudentPoints(student)
      setNewPoints(student.points?.toString() || "0")
    }
  }

  const handleClose = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
       router.push("?", { scroll: false })
    }
  }

  const handleSavePoints = async () => {
    if (editingStudentPoints && newPoints) {
      setIsSubmitting(true)
      try {
        const parsedPoints = parseInt(newPoints)
        if (isNaN(parsedPoints)) throw new Error("Invalid points value")

        const oldPoints = editingStudentPoints.points || 0
        const diff = parsedPoints - oldPoints
        const body = diff > 0 ? { add_points: diff } : { points: parsedPoints }

        const res = await fetch(`/api/students?id=${editingStudentPoints.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to update points")

        toast({
          title: "✓ تم الحفظ بنجاح",
          description: "تم تحديث نقاط الطالب بنجاح",
          className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
        })
        handleClose(false)
      } catch (error) {
        console.error("Error updating points:", error)
        alert("حدث خطأ أثناء حفظ النقاط")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="relative w-full text-center text-xl text-[#1a2332]">
            <Award className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
            <span>تعديل نقاط الطالب</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-600">اختر الحلقة</Label>
            <Select
              value={selectedCircleForPoints}
              onValueChange={(value) => { setSelectedCircleForPoints(value); setSelectedStudentForPoints(""); setEditingStudentPoints(null) }}
              dir="rtl"
            >
              <SelectTrigger className="w-full text-sm"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
              <SelectContent dir="rtl">
                {circles.map((circle) => (<SelectItem key={circle.name} value={circle.name}>{circle.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1a2332]">اختر الطالب</Label>
            <Select value={selectedStudentForPoints} onValueChange={handleSelectStudentForPoints} disabled={!selectedCircleForPoints} dir="rtl">
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={selectedCircleForPoints ? "اختر الطالب" : "اختر الحلقة أولاً"} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {availableStudentsForPoints.map((student) => (
                  <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editingStudentPoints && (
            <div className="space-y-3 pt-4 mt-2 border-t border-gray-100">
               <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                 <span className="text-sm text-neutral-600 font-medium">النقاط الحالية:</span>
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#3453a7]/30">
                   <TrendingUp className="w-4 h-4 text-[#3453a7]" />
                   <span className="font-bold text-[#1a2332]">{editingStudentPoints.points || 0}</span>
                 </div>
               </div>
               <div className="space-y-2">
                <Label className="text-sm font-bold text-[#1a2332]">الرصيد الجديد</Label>
                <Input value={newPoints} onChange={(e) => setNewPoints(e.target.value)} className="text-base h-11 text-center font-bold" type="number" dir="ltr" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
          <Button onClick={handleSavePoints} className="text-sm h-9 rounded-lg bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed" disabled={!editingStudentPoints || !newPoints || isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : "حفظ النقاط"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
