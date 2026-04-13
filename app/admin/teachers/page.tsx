"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ArrowRight, Settings, Users, User, Edit2 } from 'lucide-react'
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface Teacher {
  id: string
  name: string
  accountNumber: string
  idNumber: string
  halaqah: string
  studentCount: number
  phoneNumber?: string
  role?: string
}

interface Circle {
  id: string
  name: string
}

export default function TeacherManagement() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المعلمين");

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [newTeacherName, setNewTeacherName] = useState("")
  const [newTeacherIdNumber, setNewTeacherIdNumber] = useState("")
  const [newTeacherAccountNumber, setNewTeacherAccountNumber] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("")
  const [newTeacherRole, setNewTeacherRole] = useState<"teacher" | "deputy_teacher">("teacher")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editIdNumber, setEditIdNumber] = useState("")
  const router = useRouter()
  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      setIsLoading(false)
      loadData()
    }
  }, [router])

  const loadData = async () => {
    setIsLoadingData(true)
    await Promise.all([fetchTeachers(), fetchCircles()])
    setIsLoadingData(false)
  }

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers")
      const data = await response.json()
      if (data.teachers) {
        const mappedTeachers = data.teachers.map((t: any) => ({
          ...t,
          phoneNumber: t.phoneNumber || "",
          idNumber: t.idNumber || "",
        }))
        setTeachers(mappedTeachers)
      }
    } catch (error) {
      console.error("[v0] Error fetching teachers:", error)
    }
  }

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      if (data.circles) {
        setCircles(data.circles)
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    }
  }

  const handleAddTeacher = async () => {
    if (isSavingAdd) return

    if (
      newTeacherName.trim() &&
      newTeacherIdNumber.trim() &&
      newTeacherAccountNumber.trim() &&
      selectedHalaqah.trim()
    ) {
      try {
        setIsSavingAdd(true)
        const response = await fetch("/api/teachers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTeacherName,
            id_number: newTeacherIdNumber,
            account_number: Number.parseInt(newTeacherAccountNumber),
            halaqah: selectedHalaqah,
            role: newTeacherRole,
          }),
        })

        const data = await response.json().catch(() => null)

        if (response.ok && data?.success) {
          setTeachers((currentTeachers) => [...currentTeachers, data.teacher])
          const roleLabel = newTeacherRole === "deputy_teacher" ? "نائب معلم" : "معلم"
          const addedTeacherName = newTeacherName
          const addedTeacherHalaqah = selectedHalaqah
          setNewTeacherName("")
          setNewTeacherIdNumber("")
          setNewTeacherAccountNumber("")
          setSelectedHalaqah("")
          setNewTeacherRole("teacher")
          setIsAddDialogOpen(false)
          await showAlert(`تم إضافة ${roleLabel} ${addedTeacherName} إلى ${addedTeacherHalaqah} بنجاح`, "نجاح")
        } else {
          await showAlert(data?.error || "فشل في إضافة المعلم", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error adding teacher:", error)
        await showAlert("حدث خطأ أثناء إضافة المعلم", "خطأ")
      } finally {
        setIsSavingAdd(false)
      }
    } else {
      await showAlert("الرجاء ملء جميع الحقول", "تنبيه")
    }
  }

  const handleRemoveTeacher = async (id: string, name: string) => {
    const confirmed = await confirmDialog(`هل أنت متأكد من إزالة المعلم ${name}؟`)
    if (confirmed) {
      try {
        const response = await fetch(`/api/teachers?id=${id}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (data.success) {
          setTeachers(teachers.filter((t) => t.id !== id))
          await showAlert(`تم إزالة المعلم ${name} بنجاح`, "نجاح")
        } else {
          await showAlert(data?.error || "فشل في إزالة المعلم", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error removing teacher:", error)
        await showAlert("حدث خطأ أثناء إزالة المعلم", "خطأ")
      }
    }
  }

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditPhoneNumber(teacher.phoneNumber || "")
    setEditIdNumber(teacher.idNumber || "")
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTeacher) return

    try {
      const response = await fetch("/api/teachers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTeacher.id,
          phone_number: editPhoneNumber,
          id_number: editIdNumber,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await showAlert(`تم تحديث معلومات المعلم ${editingTeacher.name} بنجاح`, "نجاح")
        setIsEditDialogOpen(false)
        setEditingTeacher(null)
        fetchTeachers()
      } else {
        await showAlert("فشل في تحديث المعلم", "خطأ")
      }
    } catch (error) {
      console.error("[v0] Error updating teacher:", error)
      await showAlert("حدث خطأ أثناء تحديث المعلم", "خطأ")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]" dir="rtl">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Page Header */}
          <div className="flex items-center justify-between border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="w-9 h-9 rounded-lg border border-[#3453a7]/40 flex items-center justify-center text-[#4f73d1] hover:bg-[#3453a7]/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center">
                <Settings className="w-5 h-5 text-[#3453a7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">إدارة المعلمين</h1>
            </div>

            {/* Add Teacher Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" />
                  إضافة
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#1a2332]">إضافة معلم جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                    <Input id="teacherName" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="أدخل اسم المعلم" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                    <Input id="teacherAccountNumber" value={newTeacherAccountNumber} onChange={(e) => setNewTeacherAccountNumber(e.target.value)} placeholder="أدخل رقم الحساب" dir="ltr" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                    <Input id="teacherIdNumber" value={newTeacherIdNumber} onChange={(e) => setNewTeacherIdNumber(e.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">اختر الحلقة</Label>
                    <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                      <SelectTrigger><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                      <SelectContent>
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                    <Select value={newTeacherRole} onValueChange={(v) => setNewTeacherRole(v as "teacher" | "deputy_teacher")}>
                      <SelectTrigger><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">معلم</SelectItem>
                        <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
                  <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] disabled:cursor-not-allowed disabled:opacity-60">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog (no trigger, opened programmatically) */}
            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open)
                if (!open) {
                  setEditingTeacher(null)
                }
              }}
            >
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#1a2332]">تعديل معلومات المعلم</DialogTitle>
                  <DialogDescription className="text-sm text-neutral-500">تعديل رقم الهوية ورقم الجوال للمعلم {editingTeacher?.name}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                    <Input id="editIdNumber" value={editIdNumber} onChange={(e) => setEditIdNumber(e.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                    <Input id="editPhoneNumber" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
                  <Button onClick={handleSaveEdit} className="border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7]">حفظ التعديلات</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Teachers List */}
          {isLoadingData ? (
            <div className="flex justify-center py-20">
              <SiteLoader />
            </div>
          ) : teachers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-7 h-7 text-[#3453a7]" />
              </div>
              <p className="text-lg font-semibold text-neutral-500">لا يوجد معلمون حالياً</p>
              <p className="text-sm text-neutral-400 mt-1">قم بإضافة معلم جديد للبدء</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#3453a7]/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#3453a7]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">قائمة المعلمين</h2>
              </div>
              <div className="divide-y divide-[#3453a7]/20">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="px-6 py-5 hover:bg-[#3453a7]/3 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-[#3453a7]/15 border border-[#3453a7]/40 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-[#3453a7]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-bold text-[#1a2332] truncate">{teacher.name}</p>
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#3453a7]/15 text-[#4f73d1]">
                              {teacher.role === "deputy_teacher" ? "نائب معلم" : "معلم"}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">{teacher.halaqah}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3453a7]/50 text-[#4f73d1] hover:bg-[#3453a7]/10 hover:text-[#3453a7] text-sm font-medium transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          onClick={() => handleRemoveTeacher(teacher.id, teacher.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          إزالة
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
