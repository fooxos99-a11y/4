"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog, useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"
import { Edit2, Plus, Settings, Trash2, Upload, User, Users } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"

type TeacherRole = "teacher" | "deputy_teacher"
type AddTeacherDialogView = "single" | "bulk"

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

interface BulkTeacherDraft {
  id: string
  name: string
  idNumber: string
  accountNumber: string
  phoneNumber: string
  selectedHalaqah: string
  role: TeacherRole
}

function normalizeLocalizedDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0)
    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660)
    }
    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0)
    }
    return digit
  })
}

function normalizeDigits(value: unknown) {
  return normalizeLocalizedDigits(String(value || "")).replace(/\D/g, "")
}

function normalizeCircleName(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\b(حلقة|الحلقه|الحلقة)\b/g, "")
    .replace(/[\s\-_]+/g, "")
}

function getLevenshteinDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))

  for (let rowIndex = 0; rowIndex <= left.length; rowIndex += 1) {
    rows[rowIndex][0] = rowIndex
  }
  for (let columnIndex = 0; columnIndex <= right.length; columnIndex += 1) {
    rows[0][columnIndex] = columnIndex
  }

  for (let rowIndex = 1; rowIndex <= left.length; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= right.length; columnIndex += 1) {
      const substitutionCost = left[rowIndex - 1] === right[columnIndex - 1] ? 0 : 1
      rows[rowIndex][columnIndex] = Math.min(
        rows[rowIndex - 1][columnIndex] + 1,
        rows[rowIndex][columnIndex - 1] + 1,
        rows[rowIndex - 1][columnIndex - 1] + substitutionCost,
      )
    }
  }

  return rows[left.length][right.length]
}

function getCircleSuggestion(sourceName: string, circles: Circle[]) {
  const normalizedSource = normalizeCircleName(sourceName)
  if (!normalizedSource) {
    return ""
  }

  let bestMatch = ""
  let bestScore = 0

  for (const circle of circles) {
    const normalizedCircle = normalizeCircleName(circle.name)
    if (!normalizedCircle) {
      continue
    }

    if (normalizedCircle === normalizedSource) {
      return circle.name
    }

    let score = 0
    if (normalizedCircle.includes(normalizedSource) || normalizedSource.includes(normalizedCircle)) {
      score = Math.abs(normalizedCircle.length - normalizedSource.length) <= 2 ? 0.95 : 0.82
    } else {
      const distance = getLevenshteinDistance(normalizedCircle, normalizedSource)
      const maxLength = Math.max(normalizedCircle.length, normalizedSource.length)
      score = maxLength > 0 ? 1 - distance / maxLength : 0
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = circle.name
    }
  }

  return bestScore >= 0.9 ? bestMatch : ""
}

function normalizeTeacherPhoneNumber(value: unknown) {
  const trimmedValue = String(value || "").trim()
  if (!trimmedValue) {
    return ""
  }

  try {
    return normalizeGuardianPhoneForStorage(trimmedValue)
  } catch {
    return normalizeDigits(trimmedValue)
  }
}

function normalizeTeacherRole(value: unknown): TeacherRole {
  const normalizedValue = String(value || "").trim().toLowerCase()
  if (["deputy_teacher", "deputy", "assistant", "نائب معلم", "نائب", "مساعد"].includes(normalizedValue)) {
    return "deputy_teacher"
  }
  return "teacher"
}

function createBulkTeacherDraft(overrides?: Partial<BulkTeacherDraft>): BulkTeacherDraft {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    idNumber: "",
    accountNumber: "",
    phoneNumber: "",
    selectedHalaqah: "",
    role: "teacher",
    ...overrides,
  }
}

export function GlobalTeachersDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المعلمين")
  const router = useRouter()
  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [circles, setCircles] = useState<Circle[]>([])

  const [newTeacherName, setNewTeacherName] = useState("")
  const [newTeacherIdNumber, setNewTeacherIdNumber] = useState("")
  const [newTeacherAccountNumber, setNewTeacherAccountNumber] = useState("")
  const [newTeacherPhoneNumber, setNewTeacherPhoneNumber] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("")
  const [newTeacherRole, setNewTeacherRole] = useState<TeacherRole>("teacher")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addDialogView, setAddDialogView] = useState<AddTeacherDialogView>("single")
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [isSavingBulk, setIsSavingBulk] = useState(false)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editTeacherName, setEditTeacherName] = useState("")
  const [editTeacherAccountNumber, setEditTeacherAccountNumber] = useState("")
  const [editTeacherHalaqah, setEditTeacherHalaqah] = useState("")
  const [editTeacherRole, setEditTeacherRole] = useState<TeacherRole>("teacher")
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editIdNumber, setEditIdNumber] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [bulkTeachers, setBulkTeachers] = useState<BulkTeacherDraft[]>([createBulkTeacherDraft()])

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
      return
    }

    setIsLoading(false)
    void loadData()
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
        setTeachers(
          data.teachers.map((teacher: any) => ({
            ...teacher,
            phoneNumber: teacher.phoneNumber || teacher.phone_number || "",
            idNumber: teacher.idNumber || teacher.id_number || "",
            accountNumber: String(teacher.accountNumber || teacher.account_number || ""),
          })),
        )
      }
    } catch (error) {
      console.error("[teachers] Error fetching teachers:", error)
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
      console.error("[teachers] Error fetching circles:", error)
    }
  }

  const resetSingleForm = () => {
    setNewTeacherName("")
    setNewTeacherIdNumber("")
    setNewTeacherAccountNumber("")
    setNewTeacherPhoneNumber("")
    setSelectedHalaqah("")
    setNewTeacherRole("teacher")
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => router.push(window.location.pathname), 300)
    }
  }

  const handleAddTeacher = async () => {
    if (isSavingAdd) {
      return
    }

    if (!newTeacherName.trim() || !newTeacherIdNumber.trim() || !newTeacherAccountNumber.trim() || !selectedHalaqah.trim()) {
      await showAlert("الرجاء ملء جميع الحقول", "تنبيه")
      return
    }

    try {
      setIsSavingAdd(true)
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeacherName,
          id_number: newTeacherIdNumber,
          account_number: Number.parseInt(newTeacherAccountNumber),
          phone_number: newTeacherPhoneNumber,
          halaqah: selectedHalaqah,
          role: newTeacherRole,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        await showAlert(data?.error || "فشل في إضافة المعلم", "خطأ")
        return
      }

      await fetchTeachers()
      const roleLabel = newTeacherRole === "deputy_teacher" ? "نائب معلم" : "معلم"
      const teacherName = newTeacherName
      const halaqahName = selectedHalaqah
      resetSingleForm()
      setAddDialogView("single")
      setIsAddDialogOpen(false)
      await showAlert(`تم إضافة ${roleLabel} ${teacherName} إلى ${halaqahName} بنجاح`, "نجاح")
    } catch (error) {
      console.error("[teachers] Error adding teacher:", error)
      await showAlert("حدث خطأ أثناء إضافة المعلم", "خطأ")
    } finally {
      setIsSavingAdd(false)
    }
  }

  const handleRemoveTeacher = async (id: string, name: string) => {
    const confirmed = await confirmDialog(`هل أنت متأكد من إزالة المعلم ${name}؟`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/teachers?id=${id}`, { method: "DELETE" })
      const data = await response.json()
      if (!data.success) {
        await showAlert("فشل في إزالة المعلم", "خطأ")
        return
      }
      setTeachers((current) => current.filter((teacher) => teacher.id !== id))
      await showAlert(`تم إزالة المعلم ${name} بنجاح`, "نجاح")
    } catch (error) {
      console.error("[teachers] Error removing teacher:", error)
      await showAlert("حدث خطأ أثناء إزالة المعلم", "خطأ")
    }
  }

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditTeacherName(teacher.name || "")
    setEditTeacherAccountNumber(teacher.accountNumber || "")
    setEditTeacherHalaqah(teacher.halaqah || "")
    setEditTeacherRole(teacher.role === "deputy_teacher" ? "deputy_teacher" : "teacher")
    setEditPhoneNumber(teacher.phoneNumber || "")
    setEditIdNumber(teacher.idNumber || "")
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTeacher || isSavingEdit) {
      return
    }

    if (!editTeacherName.trim() || !editTeacherAccountNumber.trim() || !editTeacherHalaqah.trim() || !editIdNumber.trim()) {
      await showAlert("الرجاء تعبئة الحقول المطلوبة", "تنبيه")
      return
    }

    try {
      setIsSavingEdit(true)
      const response = await fetch("/api/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTeacher.id,
          name: editTeacherName,
          account_number: Number.parseInt(editTeacherAccountNumber),
          halaqah: editTeacherHalaqah,
          role: editTeacherRole,
          phone_number: editPhoneNumber,
          id_number: editIdNumber,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        await showAlert(data.error || "فشل في تحديث المعلم", "خطأ")
        return
      }

      await fetchTeachers()
      setIsEditDialogOpen(false)
      setEditingTeacher(null)
      await showAlert(`تم تحديث معلومات المعلم ${editTeacherName} بنجاح`, "نجاح")
    } catch (error) {
      console.error("[teachers] Error updating teacher:", error)
      await showAlert("حدث خطأ أثناء تحديث المعلم", "خطأ")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const updateBulkTeacher = (draftId: string, changes: Partial<BulkTeacherDraft>) => {
    setBulkTeachers((current) =>
      current.map((draft) => {
        if (draft.id !== draftId) {
          return draft
        }

        const nextDraft = { ...draft, ...changes }
        if (changes.idNumber !== undefined) {
          nextDraft.idNumber = normalizeDigits(changes.idNumber)
          nextDraft.accountNumber = nextDraft.idNumber
        }
        if (changes.accountNumber !== undefined) {
          nextDraft.accountNumber = normalizeDigits(changes.accountNumber)
        }
        if (changes.phoneNumber !== undefined) {
          nextDraft.phoneNumber = normalizeTeacherPhoneNumber(changes.phoneNumber)
        }
        return nextDraft
      }),
    )
  }

  const addBulkTeacherRow = () => {
    setBulkTeachers((current) => [...current, createBulkTeacherDraft()])
  }

  const removeBulkTeacherRow = (draftId: string) => {
    setBulkTeachers((current) =>
      current.length > 1 ? current.filter((draft) => draft.id !== draftId) : [createBulkTeacherDraft()],
    )
  }

  const handleImportTeachersFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, defval: "" })

      if (rows.length === 0) {
        await showAlert("ملف الإكسل فارغ", "تنبيه")
        return
      }

      const headerRow = (rows[0] || []).map((value) => normalizeCircleName(value))
      const findColumnIndex = (candidates: string[]) =>
        headerRow.findIndex((header) => candidates.some((candidate) => header === normalizeCircleName(candidate)))

      const nameColumnIndex = findColumnIndex(["اسم المعلم", "اسم", "الاسم", "teachername", "name"])
      const idColumnIndex = findColumnIndex(["رقم الهوية", "الهوية", "idnumber", "id", "identity"])
      const phoneColumnIndex = findColumnIndex(["رقم الجوال", "الجوال", "الهاتف", "phone", "phone_number", "mobile"])
      const circleColumnIndex = findColumnIndex(["الحلقة", "اسم الحلقة", "halaqah", "circle", "circlename"])
      const roleColumnIndex = findColumnIndex(["المسمى", "الصفة", "الدور", "role", "title"])

      const importedDrafts = rows
        .slice(1)
        .map((row) => {
          const name = String(nameColumnIndex >= 0 ? row[nameColumnIndex] : row[0] || "").trim()
          const idNumber = normalizeDigits(idColumnIndex >= 0 ? row[idColumnIndex] : row[1] || "")
          const phoneNumber = normalizeTeacherPhoneNumber(phoneColumnIndex >= 0 ? row[phoneColumnIndex] : "")
          const sourceHalaqahName = String(circleColumnIndex >= 0 ? row[circleColumnIndex] : row[2] || "").trim()
          const role = normalizeTeacherRole(roleColumnIndex >= 0 ? row[roleColumnIndex] : "")

          if (!name && !idNumber && !phoneNumber && !sourceHalaqahName) {
            return null
          }

          return createBulkTeacherDraft({
            name,
            idNumber,
            accountNumber: idNumber,
            phoneNumber,
            selectedHalaqah: getCircleSuggestion(sourceHalaqahName, circles),
            role,
          })
        })
        .filter((draft): draft is BulkTeacherDraft => Boolean(draft))

      if (importedDrafts.length === 0) {
        await showAlert("لم يتم العثور على صفوف صالحة داخل الملف", "تنبيه")
        return
      }

      setBulkTeachers(importedDrafts)
      await showAlert(`تم استيراد ${importedDrafts.length} صف${importedDrafts.length === 1 ? "" : "وف"} من الملف`, "نجاح")
    } catch (error) {
      console.error("[teachers] Error importing excel:", error)
      await showAlert("تعذر قراءة ملف الإكسل", "خطأ")
    } finally {
      event.target.value = ""
    }
  }

  const handleBulkAddTeachers = async () => {
    if (isSavingBulk) {
      return
    }

    const payload = bulkTeachers.map((draft) => ({
      name: draft.name.trim(),
      id_number: normalizeDigits(draft.idNumber),
      account_number: normalizeDigits(draft.accountNumber || draft.idNumber),
      phone_number: normalizeTeacherPhoneNumber(draft.phoneNumber),
      halaqah: draft.selectedHalaqah.trim(),
      role: draft.role,
    }))

    try {
      setIsSavingBulk(true)
      const response = await fetch("/api/teachers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teachers: payload }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "تعذر إضافة المعلمين جماعياً")
      }

      await fetchTeachers()
      setBulkTeachers([createBulkTeacherDraft()])
      setAddDialogView("single")
      setIsAddDialogOpen(false)

      if (Array.isArray(data.rejectedRows) && data.rejectedRows.length > 0) {
        const rejectedSummary = data.rejectedRows
          .slice(0, 5)
          .map((row: { rowNumber: number; reason: string }) => `سطر ${row.rowNumber}: ${row.reason}`)
          .join("\n")
        await showAlert(`تمت إضافة ${data.insertedCount} معلم/ة، وتعذر إضافة ${data.rejectedCount}.\n${rejectedSummary}`, "تنبيه")
      } else {
        await showAlert(`تمت إضافة ${data.insertedCount} معلم/ة بنجاح`, "نجاح")
      }
    } catch (error) {
      console.error("[teachers] Error bulk adding teachers:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء الإضافة الجماعية", "خطأ")
    } finally {
      setIsSavingBulk(false)
    }
  }

  if (isLoading || authLoading || !authVerified) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl rounded-2xl bg-white p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent px-6 py-5 text-right">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Settings className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>إدارة المعلمين</span>
            </DialogTitle>
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 rounded-xl border border-[#3453a7] bg-[#3453a7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#28448e] hover:text-white">
                    <Plus className="h-4 w-4" />
                    إضافة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[170px] rounded-xl border border-[#3453a7]/20 p-1.5" dir="rtl">
                  <DropdownMenuItem
                    onClick={() => {
                      setAddDialogView("single")
                      setIsAddDialogOpen(true)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة معلم</span>
                    <Plus className="h-4 w-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAddDialogView("bulk")
                      setIsAddDialogOpen(true)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة جماعية</span>
                    <Upload className="h-4 w-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <SiteLoader size="md" />
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between rounded-xl border border-[#3453a7]/20 bg-white p-4 transition-colors hover:border-[#3453a7]/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a2332]/5 text-[#1a2332]">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1a2332]">{teacher.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{(teacher.halaqah || "بدون حلقة").trim() || "بدون حلقة"}</p>
                        <span className="mt-1 inline-flex rounded-full bg-[#3453a7]/10 px-2 py-0.5 text-xs text-[#3453a7]">
                          {teacher.role === "deputy_teacher" ? "نائب معلم" : "معلم"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)} className="h-8 border-[#3453a7]/30 text-[#3453a7] hover:bg-[#3453a7]/10">
                        <Edit2 className="ml-1 h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveTeacher(teacher.id, teacher.name)} className="h-8 border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 className="ml-1 h-3.5 w-3.5" />
                        إزالة
                      </Button>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    <Users className="mx-auto mb-3 h-12 w-12 opacity-20" />
                    <p>لا يوجد معلمين حالياً</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          setAddDialogView("single")
        }
      }}>
        <DialogContent className={addDialogView === "bulk" ? "flex max-h-[94vh] !w-[96vw] !max-w-[1500px] sm:!max-w-[1500px] flex-col rounded-2xl bg-white p-0 overflow-hidden" : "max-w-md rounded-2xl bg-white p-0 overflow-hidden"} dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader className="border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent px-6 py-5">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Plus className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f73d1]" />
              <span>{addDialogView === "bulk" ? "إضافة جماعية للمعلمين" : "إضافة معلم جديد"}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">نافذة إضافة المعلمين.</DialogDescription>
          </DialogHeader>

          {addDialogView === "single" ? (
            <>
              <div className="space-y-4 px-6 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                    <Input id="teacherName" value={newTeacherName} onChange={(event) => setNewTeacherName(event.target.value)} placeholder="الاسم الكامل" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                    <Input id="teacherAccountNumber" value={newTeacherAccountNumber} onChange={(event) => setNewTeacherAccountNumber(event.target.value)} placeholder="00000" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                    <Input id="teacherIdNumber" value={newTeacherIdNumber} onChange={(event) => setNewTeacherIdNumber(event.target.value)} placeholder="1xxxxxxxxx" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                    <Input id="teacherPhoneNumber" value={newTeacherPhoneNumber} onChange={(event) => setNewTeacherPhoneNumber(event.target.value)} placeholder="05xxxxxxxx" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                    <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                      <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus:border-[#3453a7]"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                    <Select value={newTeacherRole} onValueChange={(value) => setNewTeacherRole(value as TeacherRole)}>
                      <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus:border-[#3453a7]"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        <SelectItem value="teacher">معلم</SelectItem>
                        <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 border-t border-[#3453a7]/25 px-6 py-4">
                <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="h-10 flex-1 rounded-lg border-none bg-[#3453a7] text-white hover:bg-[#24428f] disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-10 rounded-xl border-[#3453a7]/40 text-neutral-600">إلغاء</Button>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <div className="space-y-3 pr-1">
                  {bulkTeachers.map((draft) => (
                    <div key={draft.id} className="rounded-2xl border border-[#3453a7]/20 bg-white p-4 shadow-sm sm:p-4">
                      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(220px,1.35fr)_repeat(5,minmax(112px,1fr))]">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                          <Input value={draft.name} onChange={(event) => updateBulkTeacher(draft.id, { name: event.target.value })} placeholder="الاسم الكامل" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                          <Input value={draft.accountNumber} onChange={(event) => updateBulkTeacher(draft.id, { accountNumber: event.target.value })} placeholder="00000" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                          <Input value={draft.idNumber} onChange={(event) => updateBulkTeacher(draft.id, { idNumber: event.target.value })} placeholder="1xxxxxxxxx" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                          <Input value={draft.phoneNumber} onChange={(event) => updateBulkTeacher(draft.id, { phoneNumber: event.target.value })} placeholder="اختياري" className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                          <Select value={draft.selectedHalaqah} onValueChange={(value) => updateBulkTeacher(draft.id, { selectedHalaqah: value })}>
                            <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus:border-[#3453a7]"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                            <SelectContent>
                              {circles.map((circle) => (
                                <SelectItem key={`${draft.id}-${circle.id}`} value={circle.name}>{circle.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <Label className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                            <button type="button" onClick={() => removeBulkTeacherRow(draft.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50" aria-label="حذف المعلم">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Select value={draft.role} onValueChange={(value) => updateBulkTeacher(draft.id, { role: value as TeacherRole })}>
                            <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 text-sm focus:border-[#3453a7]"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="teacher">معلم</SelectItem>
                              <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 border-t border-[#3453a7]/25 bg-white px-4 py-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex flex-col items-stretch gap-3 sm:items-start">
                  <button type="button" onClick={addBulkTeacherRow} className="inline-flex items-center gap-2 text-sm font-medium text-[#4f73d1] transition-colors hover:text-[#3453a7]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    إضافة معلم
                  </button>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#3453a7]/40 bg-white px-4 py-2 text-sm font-semibold text-[#4f73d1] transition-colors hover:bg-[#3453a7]/10">
                    <Upload className="h-4 w-4" />
                    رفع ملف إكسل
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportTeachersFile} />
                  </label>
                </div>
                <div className="flex gap-3">
                <Button onClick={handleBulkAddTeachers} disabled={isSavingBulk} className="h-10 min-w-[150px] flex-1 rounded-lg border-none bg-[#3453a7] text-white hover:bg-[#24428f] disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">{isSavingBulk ? "جاري الحفظ..." : "حفظ"}</Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-10 min-w-[150px] flex-1 rounded-lg border-[#3453a7]/40 text-neutral-600">إلغاء</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-right text-xl text-[#1a2332]">تعديل معلومات المعلم</DialogTitle>
            <DialogDescription className="text-right text-sm text-neutral-500">تعديل بيانات المعلم {editingTeacher?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="editTeacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
              <Input id="editTeacherName" value={editTeacherName} onChange={(event) => setEditTeacherName(event.target.value)} placeholder="أدخل اسم المعلم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
              <Input id="editTeacherAccountNumber" value={editTeacherAccountNumber} onChange={(event) => setEditTeacherAccountNumber(event.target.value)} placeholder="أدخل رقم الحساب" dir="ltr" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
              <Input id="editIdNumber" value={editIdNumber} onChange={(event) => setEditIdNumber(event.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
              <Input id="editPhoneNumber" value={editPhoneNumber} onChange={(event) => setEditPhoneNumber(event.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherHalaqah" className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
              <Select value={editTeacherHalaqah} onValueChange={setEditTeacherHalaqah} dir="rtl">
                <SelectTrigger id="editTeacherHalaqah"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
              <Select value={editTeacherRole} onValueChange={(value) => setEditTeacherRole(value as TeacherRole)} dir="rtl">
                <SelectTrigger id="editTeacherRole"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="border-none bg-[#3453a7] text-white hover:bg-[#24428f] disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">{isSavingEdit ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
