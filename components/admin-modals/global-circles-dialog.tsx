"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Users, BookOpen, Eye, UserX, Info, Settings, Edit2 } from "lucide-react"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface Circle {
  name: string
  studentCount: number
}

interface Student {
  id: string
  name: string
  id_number: string
  rank: number
  halaqah: string
  created_at: string
  points: number
}

export function GlobalCirclesDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الحلقات");

  const [isLoading, setIsLoading] = useState(true); const [isOpen, setIsOpen] = useState(true); const handleClose = (open) => { if(!open) { setIsOpen(false); setTimeout(() => router.push(window.location.pathname), 300) } }
  const [newCircleName, setNewCircleName] = useState("")
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null)
  const [editedCircleName, setEditedCircleName] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false)
  const [circleStudents, setCircleStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isStudentInfoDialogOpen, setIsStudentInfoDialogOpen] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(true)
  const router = useRouter()

  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  const fetchCircles = async () => {
    try {
      const response = await fetch(`/api/circles?t=${Date.now()}`, { cache: "no-store" })
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

  useEffect(() => {
    fetchCircles()
  }, [])

  const handleAddCircle = async () => {
    if (newCircleName.trim()) {
      try {
        const response = await fetch("/api/circles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCircleName }),
        })

        const data = await response.json().catch(() => null)

        if (response.ok) {
          localStorage.removeItem("circlesCache")
          localStorage.removeItem("circlesCacheTime")
          setNewCircleName("")
          setIsAddDialogOpen(false)
          await showAlert(`تم إضافة حلقة ${newCircleName} بنجاح. سيتم إنشاؤها عند إضافة أول طالب.`, "نجاح")
          fetchCircles()
        } else {
          await showAlert(data?.error || "تعذر إضافة الحلقة", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error adding circle:", error)
        await showAlert("حدث خطأ أثناء إضافة الحلقة", "خطأ")
      }
    }
  }

  const handleOpenEditCircle = (circle: Circle) => {
    setEditingCircle(circle)
    setEditedCircleName(circle.name)
    setIsEditDialogOpen(true)
  }

  const handleSaveCircleEdit = async () => {
    if (!editingCircle || !editedCircleName.trim()) {
      await showAlert("اسم الحلقة مطلوب", "تنبيه")
      return
    }

    try {
      const response = await fetch("/api/circles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_name: editingCircle.name, new_name: editedCircleName }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        await showAlert(data?.error || "تعذر تعديل الحلقة", "خطأ")
        return
      }

      localStorage.removeItem("circlesCache")
      localStorage.removeItem("circlesCacheTime")
      window.dispatchEvent(new Event("circlesChanged"))
      setIsEditDialogOpen(false)
      setEditingCircle(null)
      setEditedCircleName("")
      await showAlert(`تم تعديل اسم الحلقة إلى ${editedCircleName} بنجاح`, "نجاح")
      fetchCircles()
    } catch (error) {
      console.error("[v0] Error editing circle:", error)
      await showAlert("حدث خطأ أثناء تعديل الحلقة", "خطأ")
    }
  }

  const handleRemoveCircle = async (name: string) => {
    const confirmed = await confirmDialog(
      `هل أنت متأكد من إزالة ${name}؟ سيتم حذف جميع الطلاب في هذه الحلقة.`,
      "تأكيد إزالة الحلقة",
    )
    if (confirmed) {
      try {
        const response = await fetch(`/api/circles?name=${encodeURIComponent(name)}`, {
          method: "DELETE",
        })

        if (response.ok) {
          localStorage.removeItem("circlesCache")
          localStorage.removeItem("circlesCacheTime")
          window.dispatchEvent(new Event("circlesChanged"))
          await showAlert(`تم إزالة ${name} بنجاح`, "نجاح")
          fetchCircles()
        }
      } catch (error) {
        console.error("[v0] Error removing circle:", error)
        await showAlert("حدث خطأ أثناء إزالة الحلقة", "خطأ")
      }
    }
  }

  const handleViewCircle = async (circle: Circle) => {
    setSelectedCircle(circle)
    setIsStudentsDialogOpen(true)
    setIsLoadingStudents(true)
    setCircleStudents([])

    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(circle.name)}`)
      const data = await response.json()
      if (data.students) {
        const sortedStudents = (data.students || []).sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
        setCircleStudents(sortedStudents)
      }
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    const confirmed = await confirmDialog(`هل أنت متأكد من إزالة ${studentName} من الحلقة؟`)
    if (confirmed) {
      try {
        const response = await fetch(`/api/students?id=${studentId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          await showAlert(`تم إزالة ${studentName} من الحلقة بنجاح`, "نجاح")
          if (selectedCircle) {
            const studentsResponse = await fetch(`/api/students?circle=${encodeURIComponent(selectedCircle.name)}`)
            const data = await studentsResponse.json()
            if (data.students) {
              setCircleStudents(data.students)
            }
          }
          fetchCircles()
        }
      } catch (error) {
        console.error("[v0] Error removing student:", error)
        await showAlert("حدث خطأ أثناء إزالة الطالب", "خطأ")
      }
    }
  }

  const handleViewStudentInfo = (student: Student) => {
    setSelectedStudent(student)
    setIsStudentInfoDialogOpen(true)
  }

  const handleAttendanceClose = () => {
    setShowTeacherAttendance(false)
  }

  if (isLoading || authLoading || !authVerified) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Settings className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>إدارة الحلقات</span>
            </DialogTitle>
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7] bg-[#3453a7] hover:bg-[#28448e] text-white hover:text-white text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:border-[#3453a7]">
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {circles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-[#3453a7]" />
                </div>
                <p className="text-lg font-semibold text-neutral-500">لا يوجد حلقات حالياً</p>
                <p className="text-sm text-neutral-400 mt-1">قم بإضافة حلقة جديدة للبدء</p>
              </div>
            ) : (
              <div className="space-y-3">
                {circles.map((circle) => (
                  <div key={circle.name} className="rounded-2xl border border-[#3453a7]/40 bg-white px-6 py-5 shadow-sm hover:bg-[#3453a7]/3 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-[#3453a7]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-[#1a2332] break-words">{circle.name}</p>
                        <p className="mt-1 text-sm text-neutral-400">{circle.studentCount} طالب</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleOpenEditCircle(circle)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#d8e4fb] text-[#4f73d1] hover:bg-[#3453a7]/10 hover:text-[#3453a7] text-sm font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleViewCircle(circle)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#3453a7]/50 text-[#4f73d1] hover:bg-[#3453a7]/10 hover:text-[#3453a7] text-sm font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض الطلاب
                      </button>
                      <button
                        onClick={() => handleRemoveCircle(circle.name)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">إضافة حلقة جديدة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="circleName" className="text-sm font-semibold text-[#1a2332]">اسم الحلقة</Label>
              <Input
                id="circleName"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                placeholder="مثال: حلقة أبو بكر الصديق"
                onKeyDown={(e) => e.key === "Enter" && handleAddCircle()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleAddCircle} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">تعديل اسم الحلقة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCircleName" className="text-sm font-semibold text-[#1a2332]">اسم الحلقة</Label>
              <Input
                id="editCircleName"
                value={editedCircleName}
                onChange={(e) => setEditedCircleName(e.target.value)}
                placeholder="أدخل اسم الحلقة"
                onKeyDown={(e) => e.key === "Enter" && handleSaveCircleEdit()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleSaveCircleEdit} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStudentsDialogOpen} onOpenChange={setIsStudentsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">طلاب {selectedCircle?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {isLoadingStudents ? (
              <div className="flex justify-center py-12">
                <SiteLoader size="md" />
              </div>
            ) : circleStudents.length > 0 ? (
              <div className="divide-y divide-[#3453a7]/20 rounded-xl border border-[#3453a7]/40 overflow-hidden">
                {circleStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#3453a7]/3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#3453a7]/15 border border-[#3453a7]/40 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#3453a7]">{student.rank || "-"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2332]">{student.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewStudentInfo(student)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#3453a7]/50 text-[#4f73d1] hover:bg-[#3453a7]/10 hover:text-[#3453a7] text-xs font-medium transition-colors"
                      >
                        <Info className="w-3 h-3" /> عرض
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.id, student.name)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-medium transition-colors"
                      >
                        <UserX className="w-3 h-3" /> إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا يوجد طلاب في هذه الحلقة</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStudentInfoDialogOpen} onOpenChange={setIsStudentInfoDialogOpen}>
        <DialogContent className="sm:max-w-[460px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">معلومات الطالب</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">البيانات الشخصية للطالب</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <>
              <div className="space-y-3 py-2">
                {[
                  { label: "الاسم", value: selectedStudent.name },
                  { label: "رقم الهوية", value: selectedStudent.id_number || "—" },
                  { label: "الحلقة", value: selectedStudent.halaqah },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3 bg-[#fafaf9] rounded-xl border border-[#3453a7]/20">
                    <span className="text-sm font-semibold text-neutral-500">{label}</span>
                    <span className="text-sm font-bold text-[#1a2332]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsStudentInfoDialogOpen(false)} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none">
                  إغلاق
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </>
  )
}
