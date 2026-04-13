"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Settings, Users, User, Edit2, Upload } from "lucide-react"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"
import * as XLSX from "xlsx"

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

type BulkTeacherDraft = {
  id: string
  name: string
  idNumber: string
  accountNumber: string
  phoneNumber: string
  selectedHalaqah: string
  role: "teacher" | "deputy_teacher"
}

type AddTeacherDialogView = "single" | "bulk"

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

  for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
    rows[leftIndex][0] = leftIndex
  }

  for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
    rows[0][rightIndex] = rightIndex
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      rows[leftIndex][rightIndex] = Math.min(
        rows[leftIndex - 1][rightIndex] + 1,
        rows[leftIndex][rightIndex - 1] + 1,
        rows[leftIndex - 1][rightIndex - 1] + substitutionCost,
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
      const lengthGap = Math.abs(normalizedCircle.length - normalizedSource.length)
      score = lengthGap <= 2 ? 0.95 : 0.82
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

function normalizeTeacherRole(value: unknown) {
  const normalizedValue = String(value || "").trim().toLowerCase()

  if (["deputy_teacher", "deputy", "assistant", "نائب معلم", "نائب", "مساعد"].includes(normalizedValue)) {
    return "deputy_teacher" as const
  }

  return "teacher" as const
}

export function GlobalTeachersDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المعلمين")

  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [newTeacherName, setNewTeacherName] = useState("")
  const [newTeacherIdNumber, setNewTeacherIdNumber] = useState("")
  const [newTeacherAccountNumber, setNewTeacherAccountNumber] = useState("")
  const [newTeacherPhoneNumber, setNewTeacherPhoneNumber] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("")
  const [newTeacherRole, setNewTeacherRole] = useState<"teacher" | "deputy_teacher">("teacher")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addDialogView, setAddDialogView] = useState<AddTeacherDialogView>("single")
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editTeacherName, setEditTeacherName] = useState("")
  const [editTeacherAccountNumber, setEditTeacherAccountNumber] = useState("")
  const [editTeacherHalaqah, setEditTeacherHalaqah] = useState("")
  const [editTeacherRole, setEditTeacherRole] = useState<"teacher" | "deputy_teacher">("teacher")
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editIdNumber, setEditIdNumber] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [bulkTeachers, setBulkTeachers] = useState<BulkTeacherDraft[]>([createBulkTeacherDraft()])
  const router = useRouter()
  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => router.push(window.location.pathname), 300)
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      setIsLoading(false)
      void loadData()
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
        const mappedTeachers = data.teachers.map((teacher: any) => ({
          ...teacher,
          phoneNumber: teacher.phoneNumber || "",
          idNumber: teacher.idNumber || "",
        }))
        setTeachers(mappedTeachers)
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

  const handleAddTeacher = async () => {
    if (isSavingAdd) return

    if (!newTeacherName.trim() || !newTeacherIdNumber.trim() || !newTeacherAccountNumber.trim() || !selectedHalaqah.trim()) {
      await showAlert("الرجاء ملء جميع الحقول", "تنبيه")
      return
    }

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

      setTeachers((currentTeachers) => [...currentTeachers, data.teacher])
      const roleLabel = newTeacherRole === "deputy_teacher" ? "نائب معلم" : "معلم"
      const addedTeacherName = newTeacherName
      const addedTeacherHalaqah = selectedHalaqah
      resetSingleForm()
      setAddDialogView("single")
      setIsAddDialogOpen(false)
      await showAlert(`تم إضافة ${roleLabel} ${addedTeacherName} إلى ${addedTeacherHalaqah} بنجاح`, "نجاح")
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
      const response = await fetch(`/api/teachers?id=${id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        setTeachers((current) => current.filter((teacher) => teacher.id !== id))
        await showAlert(`تم إزالة المعلم ${name} بنجاح`, "نجاح")
      } else {
        await showAlert("فشل في إزالة المعلم", "خطأ")
      }
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
    if (!editingTeacher || isSavingEdit) return

    if (!editTeacherName.trim() || !editTeacherAccountNumber.trim() || !editTeacherHalaqah.trim() || !editIdNumber.trim()) {
      await showAlert("الرجاء تعبئة الحقول المطلوبة", "تنبيه")
      return
    }

    try {
      setIsSavingEdit(true)
      const response = await fetch("/api/teachers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

      const updatedTeacher = data.teacher
        ? {
            id: data.teacher.id,
            name: data.teacher.name,
            accountNumber: data.teacher.account_number?.toString() || data.teacher.accountNumber || "",
            idNumber: data.teacher.id_number || data.teacher.idNumber || "",
            halaqah: data.teacher.halaqah || "",
            studentCount: editingTeacher.studentCount,
            phoneNumber: data.teacher.phone_number || data.teacher.phoneNumber || "",
            role: data.teacher.role || "teacher",
          }
        : {
            ...editingTeacher,
            name: editTeacherName,
            accountNumber: editTeacherAccountNumber,
            idNumber: editIdNumber,
            halaqah: editTeacherHalaqah,
            phoneNumber: editPhoneNumber,
            role: editTeacherRole,
          }

      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) => (teacher.id === editingTeacher.id ? updatedTeacher : teacher)),
      )
      setIsEditDialogOpen(false)
      setEditingTeacher(null)
      setEditTeacherName("")
      setEditTeacherAccountNumber("")
      setEditTeacherHalaqah("")
      setEditTeacherRole("teacher")
      setEditPhoneNumber("")
      setEditIdNumber("")
      await showAlert(`تم تحديث معلومات المعلم ${updatedTeacher.name} بنجاح`, "نجاح")
    } catch (error) {
      console.error("[teachers] Error updating teacher:", error)
      await showAlert("حدث خطأ أثناء تحديث المعلم", "خطأ")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const updateBulkTeacher = (draftId: string, changes: Partial<BulkTeacherDraft>) => {
    setBulkTeachers((current) => current.map((draft) => {
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
    }))
  }

  const addBulkTeacherRow = () => {
    setBulkTeachers((current) => [...current, createBulkTeacherDraft()])
  }

  const removeBulkTeacherRow = (draftId: string) => {
    setBulkTeachers((current) => (current.length > 1 ? current.filter((draft) => draft.id !== draftId) : [createBulkTeacherDraft()]))
  }

  const handleImportTeachersFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const firstSheet = workbook.Sheets[firstSheetName]
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
      const dataRows = rows.slice(1)

      const importedDrafts = dataRows
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
    if (isSavingBulk) return

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
        headers: {
          "Content-Type": "application/json",
        },
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
        <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Settings className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>إدارة المعلمين</span>
            </DialogTitle>
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7] bg-[#3453a7] hover:bg-[#28448e] text-white hover:text-white text-sm font-semibold shadow-none">
                    <Plus className="w-4 h-4" />
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
                    <Plus className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAddDialogView("bulk")
                      setIsAddDialogOpen(true)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة جماعية</span>
                    <Upload className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <SiteLoader size="md" />
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-white border border-[#3453a7]/20 rounded-xl hover:border-[#3453a7]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1a2332]/5 flex items-center justify-center text-[#1a2332]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a2332] text-sm">{teacher.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{(teacher.halaqah || "بدون حلقة").trim() || "بدون حلقة"}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                          <span className="bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded-full">
                            {teacher.role === "deputy_teacher" ? "نائب معلم" : "معلم"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)} className="h-8 border-[#3453a7]/30 hover:bg-[#3453a7]/10 text-[#3453a7]">
                        <Edit2 className="w-3.5 h-3.5 ml-1" />
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveTeacher(teacher.id, teacher.name)} className="h-8 border-red-200 hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5 ml-1" />
                        إزالة
                      </Button>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا يوجد معلمين حالياً</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setAddDialogView("single")
          }
        }}
      >
        <DialogContent
          className={
            addDialogView === "bulk"
              ? "sm:max-w-[760px] max-h-[90vh] bg-white rounded-2xl p-0 overflow-hidden"
              : "max-w-md bg-white rounded-2xl p-0 overflow-hidden"
          }
          dir="rtl"
          style={{ zIndex: 110 }}
        >
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Plus className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f73d1]" />
              <span>{addDialogView === "bulk" ? "إضافة جماعية للمعلمين" : "إضافة معلم جديد"}</span>
            </DialogTitle>
          </DialogHeader>

          {addDialogView === "single" ? (
            <>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherName" className="text-sm font-semibold text-[#1a2332]">
                      اسم المعلم
                    </Label>
                    <Input
                      id="teacherName"
                      value={newTeacherName}
                      onChange={(event) => setNewTeacherName(event.target.value)}
                      placeholder="الاسم الكامل"
                      className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">
                      رقم الحساب
                    </Label>
                    <Input
                      id="teacherAccountNumber"
                      value={newTeacherAccountNumber}
                      onChange={(event) => setNewTeacherAccountNumber(event.target.value)}
                      placeholder="00000"
                      className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                      dir="ltr"
                      type="number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherIdNumber" className="text-sm font-semibold text-[#1a2332]">
                      رقم الهوية
                    </Label>
                    <Input
                      id="teacherIdNumber"
                      value={newTeacherIdNumber}
                      onChange={(event) => setNewTeacherIdNumber(event.target.value)}
                      placeholder="1xxxxxxxxx"
                      className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherPhoneNumber" className="text-sm font-semibold text-[#1a2332]">
                      رقم الجوال
                    </Label>
                    <Input
                      id="teacherPhoneNumber"
                      value={newTeacherPhoneNumber}
                      onChange={(event) => setNewTeacherPhoneNumber(event.target.value)}
                      placeholder="05xxxxxxxx"
                      className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">
                      الحلقة
                    </Label>
                    <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                      <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.name}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">
                      المسمى الوظيفي
                    </Label>
                    <Select value={newTeacherRole} onValueChange={(value) => setNewTeacherRole(value as "teacher" | "deputy_teacher") }>
                      <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                        <SelectValue placeholder="اختر المسمى" />
                      </SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        <SelectItem value="teacher">معلم</SelectItem>
                        <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#3453a7]/25 flex gap-3">
                <Button
                  onClick={handleAddTeacher}
                  disabled={isSavingAdd}
                  className="flex-1 h-10 rounded-lg bg-[#3453a7] text-white font-medium transition-colors hover:bg-[#24428f] border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  {isSavingAdd ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10">
                  إلغاء
                </Button>
              </div>
            </>
          ) : null}

          {addDialogView === "bulk" ? (
            <>
              <div className="px-6 py-5 space-y-4 overflow-y-auto">
                <div className="rounded-2xl border border-[#3453a7]/20 bg-[#fafcff] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1 text-right">
                      <p className="text-sm font-bold text-[#1a2332]">رفع ملف إكسل</p>
                      <p className="text-xs text-neutral-500">الأعمدة المدعومة: اسم المعلم، رقم الهوية، الحلقة.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#3453a7]/40 bg-white px-4 py-2 text-sm font-semibold text-[#4f73d1] transition-colors hover:bg-[#3453a7]/10 w-fit">
                      <Upload className="h-4 w-4" />
                      رفع إكسل
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportTeachersFile} />
                    </label>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {bulkTeachers.map((draft, index) => (
                    <div key={draft.id} className="rounded-2xl border border-[#3453a7]/20 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-[#1a2332]">المعلم {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeBulkTeacherRow(draft.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>

                      <div className="grid grid-cols-6 gap-3 items-end">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                          <Input
                            value={draft.name}
                            onChange={(event) => updateBulkTeacher(draft.id, { name: event.target.value })}
                            placeholder="الاسم الكامل"
                            className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                          <Input
                            value={draft.accountNumber}
                            onChange={(event) => updateBulkTeacher(draft.id, { accountNumber: event.target.value })}
                            placeholder="00000"
                            className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                          <Input
                            value={draft.idNumber}
                            onChange={(event) => updateBulkTeacher(draft.id, { idNumber: event.target.value })}
                            placeholder="1xxxxxxxxx"
                            className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                          <Input
                            value={draft.phoneNumber}
                            onChange={(event) => updateBulkTeacher(draft.id, { phoneNumber: event.target.value })}
                            placeholder="اختياري"
                            className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                          <Select value={draft.selectedHalaqah} onValueChange={(value) => updateBulkTeacher(draft.id, { selectedHalaqah: value })}>
                            <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                              <SelectValue placeholder="اختر الحلقة" />
                            </SelectTrigger>
                            <SelectContent>
                              {circles.map((circle) => (
                                <SelectItem key={`${draft.id}-${circle.id}`} value={circle.name}>
                                  {circle.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                          <Select value={draft.role} onValueChange={(value) => updateBulkTeacher(draft.id, { role: value as "teacher" | "deputy_teacher" })}>
                            <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                              <SelectValue placeholder="اختر المسمى" />
                            </SelectTrigger>
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

                <button
                  type="button"
                  onClick={addBulkTeacherRow}
                  className="flex items-center gap-2 text-sm text-[#4f73d1] hover:text-[#3453a7] font-medium transition-colors"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  إضافة صف جديد
                </button>
              </div>

              <div className="px-6 py-4 border-t border-[#3453a7]/25 flex gap-3">
                <Button
                  onClick={handleBulkAddTeachers}
                  disabled={isSavingBulk}
                  className="flex-1 h-10 rounded-lg bg-[#3453a7] text-white font-medium transition-colors hover:bg-[#24428f] border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  {isSavingBulk ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10">
                  إلغاء
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">تعديل معلومات المعلم</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 text-right">تعديل بيانات المعلم {editingTeacher?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="editTeacherName" className="text-sm font-semibold text-[#1a2332]">
                اسم المعلم
              </Label>
              <Input id="editTeacherName" value={editTeacherName} onChange={(event) => setEditTeacherName(event.target.value)} placeholder="أدخل اسم المعلم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">
                رقم الحساب
              </Label>
              <Input
                id="editTeacherAccountNumber"
                value={editTeacherAccountNumber}
                onChange={(event) => setEditTeacherAccountNumber(event.target.value)}
                placeholder="أدخل رقم الحساب"
                dir="ltr"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIdNumber" className="text-sm font-semibold text-[#1a2332]">
                رقم الهوية
              </Label>
              <Input id="editIdNumber" value={editIdNumber} onChange={(event) => setEditIdNumber(event.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber" className="text-sm font-semibold text-[#1a2332]">
                رقم الجوال
              </Label>
              <Input id="editPhoneNumber" value={editPhoneNumber} onChange={(event) => setEditPhoneNumber(event.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherHalaqah" className="text-sm font-semibold text-[#1a2332]">
                الحلقة
              </Label>
              <Select value={editTeacherHalaqah} onValueChange={setEditTeacherHalaqah} dir="rtl">
                <SelectTrigger id="editTeacherHalaqah">
                  <SelectValue placeholder="اختر الحلقة" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  {circles.map((circle) => (
                    <SelectItem key={circle.id} value={circle.name}>
                      {circle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherRole" className="text-sm font-semibold text-[#1a2332]">
                المسمى الوظيفي
              </Label>
              <Select value={editTeacherRole} onValueChange={(value) => setEditTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                <SelectTrigger id="editTeacherRole">
                  <SelectValue placeholder="اختر المسمى" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">
              {isSavingEdit ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Settings, Users, User, Edit2, Upload } from 'lucide-react'
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"
import * as XLSX from "xlsx"

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

type BulkTeacherDraft = {
  id: string
  name: string
  idNumber: string
  accountNumber: string
  phoneNumber: string
  selectedHalaqah: string
  role: "teacher" | "deputy_teacher"
}

type AddTeacherDialogView = "single" | "bulk"

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
        <DialogContent className={addDialogView === "bulk" ? "sm:max-w-[760px] max-h-[90vh] bg-white rounded-2xl p-0 overflow-hidden" : "max-w-md bg-white rounded-2xl p-0 overflow-hidden"} dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Plus className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f73d1]" />
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
              <DialogDescription className="mt-3 text-right text-sm leading-7 text-neutral-500">
    .replace(/ة/g, "ه")
    .replace(/\b(حلقة|الحلقه|الحلقة)\b/g, "")
    .replace(/[\s\-_]+/g, "")
}

function getLevenshteinDistance(left: string, right: string) {
              <div className="px-6 py-5 space-y-4 text-right">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                    <Input id="teacherName" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="الاسم الكامل" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                    <Input id="teacherAccountNumber" value={newTeacherAccountNumber} onChange={(e) => setNewTeacherAccountNumber(e.target.value)} placeholder="00000" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                    <Input id="teacherIdNumber" value={newTeacherIdNumber} onChange={(e) => setNewTeacherIdNumber(e.target.value)} placeholder="1xxxxxxxxx" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                    <Input id="teacherPhoneNumber" value={newTeacherPhoneNumber} onChange={(e) => setNewTeacherPhoneNumber(e.target.value)} placeholder="05xxxxxxxx" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                    <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah} dir="rtl">
                      <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                    <Select value={newTeacherRole} onValueChange={(value) => setNewTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                      <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                      <SelectContent style={{ zIndex: 120 }}>
                        <SelectItem value="teacher">معلم</SelectItem>
                        <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#3453a7]/25 flex gap-3" dir="rtl">
                <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="flex-1 h-10 rounded-lg bg-[#3453a7] text-white font-medium transition-colors hover:bg-[#24428f] border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10">إلغاء</Button>
              </div>
            </>
          ) : null}

          {addDialogView === "bulk" ? (
            <>
              <div className="px-6 py-5 space-y-4 overflow-y-auto">
                <div className="rounded-2xl border border-[#3453a7]/20 bg-[#fafcff] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1 text-right">
                      <p className="text-sm font-bold text-[#1a2332]">رفع ملف إكسل</p>
                      <p className="text-xs text-neutral-500">الأعمدة المدعومة: اسم المعلم، رقم الهوية، الحلقة.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#3453a7]/40 bg-white px-4 py-2 text-sm font-semibold text-[#4f73d1] transition-colors hover:bg-[#3453a7]/10 w-fit">
                      <Upload className="h-4 w-4" />
                      رفع إكسل
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportTeachersFile} />
                    </label>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {bulkTeachers.map((draft, index) => (
                    <div key={draft.id} className="rounded-2xl border border-[#3453a7]/20 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-[#1a2332]">المعلم {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeBulkTeacherRow(draft.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                          <Input value={draft.name} onChange={(event) => updateBulkTeacher(draft.id, { name: event.target.value })} placeholder="الاسم الكامل" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                          <Input value={draft.accountNumber} onChange={(event) => updateBulkTeacher(draft.id, { accountNumber: event.target.value })} placeholder="00000" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                          <Input value={draft.idNumber} onChange={(event) => updateBulkTeacher(draft.id, { idNumber: event.target.value })} placeholder="1xxxxxxxxx" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                          <Input value={draft.phoneNumber} onChange={(event) => updateBulkTeacher(draft.id, { phoneNumber: event.target.value })} placeholder="اختياري" className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                          <Select value={draft.selectedHalaqah} onValueChange={(value) => updateBulkTeacher(draft.id, { selectedHalaqah: value })}>
                            <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                              <SelectValue placeholder="اختر الحلقة" />
                            </SelectTrigger>
                            <SelectContent>
                              {circles.map((circle) => (
                                <SelectItem key={`${draft.id}-${circle.id}`} value={circle.name}>{circle.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                          <Select value={draft.role} onValueChange={(value) => updateBulkTeacher(draft.id, { role: value as "teacher" | "deputy_teacher" })}>
                            <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                              <SelectValue placeholder="اختر المسمى" />
                            </SelectTrigger>
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

                <button
                  type="button"
                  onClick={addBulkTeacherRow}
                  className="flex items-center gap-2 text-sm text-[#4f73d1] hover:text-[#3453a7] font-medium transition-colors"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  إضافة صف جديد
                </button>
              </div>

              <div className="px-6 py-4 border-t border-[#3453a7]/25 flex gap-3" dir="rtl">
                <Button onClick={handleBulkAddTeachers} disabled={isSavingBulk} className="flex-1 h-10 rounded-lg bg-[#3453a7] text-white font-medium transition-colors hover:bg-[#24428f] border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed">{isSavingBulk ? "جاري الحفظ..." : "حفظ"}</Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10">إلغاء</Button>
              </div>
            </>
          ) : null}
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
            phone_number: newTeacherPhoneNumber,
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
          setNewTeacherPhoneNumber("")
          setSelectedHalaqah("")
          setNewTeacherRole("teacher")
          setAddDialogView("single")
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
          await showAlert("فشل في إزالة المعلم", "خطأ")
        }
      } catch (error) {
        console.error("[v0] Error removing teacher:", error)
        await showAlert("حدث خطأ أثناء إزالة المعلم", "خطأ")
      }
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

  const updateBulkTeacher = (draftId: string, changes: Partial<BulkTeacherDraft>) => {
    setBulkTeachers((current) => current.map((draft) => {
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
    }))
  }

  const addBulkTeacherRow = () => {
    setBulkTeachers((current) => [...current, createBulkTeacherDraft()])
  }

  const removeBulkTeacherRow = (draftId: string) => {
    setBulkTeachers((current) => current.length > 1 ? current.filter((draft) => draft.id !== draftId) : [createBulkTeacherDraft()])
  }

  const handleImportTeachersFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      const firstSheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, { header: 1, defval: "" })

      if (rows.length === 0) {
        await showAlert("ملف الإكسل فارغ", "تنبيه")
        return
      }

      const headerRow = (rows[0] || []).map((value) => normalizeCircleName(value))
      const findColumnIndex = (candidates: string[]) => headerRow.findIndex((header) => candidates.some((candidate) => header === normalizeCircleName(candidate)))
      const nameColumnIndex = findColumnIndex(["اسم المعلم", "اسم", "الاسم", "teachername", "name"])
      const idColumnIndex = findColumnIndex(["رقم الهوية", "الهوية", "idnumber", "id", "identity"])
      const phoneColumnIndex = findColumnIndex(["رقم الجوال", "الجوال", "الهاتف", "phone", "phone_number", "mobile"])
      const circleColumnIndex = findColumnIndex(["الحلقة", "اسم الحلقة", "halaqah", "circle", "circlename"])
      const roleColumnIndex = findColumnIndex(["المسمى", "الصفة", "الدور", "role", "title"])
      const dataRows = rows.slice(1)

      const importedDrafts = dataRows.map((row) => {
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
      }).filter((draft): draft is BulkTeacherDraft => Boolean(draft))

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
    if (isSavingBulk) return

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
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleSaveEdit = async () => {
    if (!editingTeacher || isSavingEdit) return

    if (
      !editTeacherName.trim() ||
      !editTeacherAccountNumber.trim() ||
      !editTeacherHalaqah.trim() ||
      !editIdNumber.trim()
    ) {
      await showAlert("الرجاء تعبئة الحقول المطلوبة", "تنبيه")
      return
    }

    try {
      setIsSavingEdit(true)
      const response = await fetch("/api/teachers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (data.success) {
        const updatedTeacher = data.teacher
          ? {
              id: data.teacher.id,
              name: data.teacher.name,
              accountNumber: data.teacher.account_number?.toString() || data.teacher.accountNumber || "",
              idNumber: data.teacher.id_number || data.teacher.idNumber || "",
              halaqah: data.teacher.halaqah || "",
              studentCount: editingTeacher.studentCount,
              phoneNumber: data.teacher.phone_number || data.teacher.phoneNumber || "",
              role: data.teacher.role || "teacher",
            }
          : {
              ...editingTeacher,
              name: editTeacherName,
              accountNumber: editTeacherAccountNumber,
              idNumber: editIdNumber,
              halaqah: editTeacherHalaqah,
              phoneNumber: editPhoneNumber,
              role: editTeacherRole,
            }

        setTeachers((currentTeachers) =>
          currentTeachers.map((teacher) => (teacher.id === editingTeacher.id ? updatedTeacher : teacher)),
        )
        setIsEditDialogOpen(false)
        setEditingTeacher(null)
        setEditTeacherName("")
        setEditTeacherAccountNumber("")
        setEditTeacherHalaqah("")
        setEditTeacherRole("teacher")
        setEditPhoneNumber("")
        setEditIdNumber("")
        void showAlert(`تم تحديث معلومات المعلم ${updatedTeacher.name} بنجاح`, "نجاح")
      } else {
        void showAlert(data.error || "فشل في تحديث المعلم", "خطأ")
      }
    } catch (error) {
      console.error("[v0] Error updating teacher:", error)
      void showAlert("حدث خطأ أثناء تحديث المعلم", "خطأ")
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
              <Settings className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>إدارة المعلمين</span>
            </DialogTitle>
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7] bg-[#3453a7] hover:bg-[#28448e] text-white hover:text-white text-sm font-semibold shadow-none">
                    <Plus className="w-4 h-4" />
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
                    <Plus className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAddDialogView("bulk")
                      setIsAddDialogOpen(true)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة جماعية</span>
                    <Upload className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {isLoadingData ? (
              <div className="flex justify-center py-8">
                <SiteLoader size="md" />
              </div>
            ) : (
              <div className="space-y-3">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-white border border-[#3453a7]/20 rounded-xl hover:border-[#3453a7]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1a2332]/5 flex items-center justify-center text-[#1a2332]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a2332] text-sm">{teacher.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{(teacher.halaqah || "بدون حلقة").trim() || "بدون حلقة"}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                          <span className="bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded-full">
                            {teacher.role === 'deputy_teacher' ? 'نائب معلم' : 'معلم'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)} className="h-8 border-[#3453a7]/30 hover:bg-[#3453a7]/10 text-[#3453a7]">
                        <Edit2 className="w-3.5 h-3.5 ml-1" />
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveTeacher(teacher.id, teacher.name)} className="h-8 border-red-200 hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5 ml-1" />
                        إزالة
                      </Button>
                    </div>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>لا يوجد معلمين حالياً</p>
                  </div>
                )}
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
        <DialogContent className={addDialogView === "bulk" ? "sm:max-w-[1100px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[480px]"} dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">
              {addDialogView === "bulk" ? "إضافة جماعية للمعلمين" : "إضافة معلم جديد"}
            </DialogTitle>
            {addDialogView === "bulk" ? (
              <DialogDescription className="text-right text-sm leading-7 text-neutral-500">
                يمكنك الإدخال اليدوي أو رفع ملف إكسل. عند الرفع سيتم أخذ اسم المعلم ورقم الهوية وتحويله تلقائيًا إلى رقم الحساب، وسيبقى اختيار الحلقة فارغًا إلا إذا تم العثور على حلقة مطابقة أو قريبة جدًا.
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {addDialogView === "single" ? (
            <>
              <div className="grid gap-4 py-4 text-right">
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
                  <Label htmlFor="teacherPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                  <Input id="teacherPhoneNumber" value={newTeacherPhoneNumber} onChange={(e) => setNewTeacherPhoneNumber(e.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="halaqah" className="text-sm font-semibold text-[#1a2332]">اختر الحلقة</Label>
                  <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah} dir="rtl">
                    <SelectTrigger><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                    <SelectContent style={{ zIndex: 120 }}>
                      {circles.map((circle) => (
                        <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherRole" className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                  <Select value={newTeacherRole} onValueChange={(value) => setNewTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                    <SelectTrigger><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                    <SelectContent style={{ zIndex: 120 }}>
                      <SelectItem value="teacher">معلم</SelectItem>
                      <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3" dir="rtl">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
                <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </>
          ) : null}

          {addDialogView === "bulk" ? (
            <>
              <div className="space-y-5 py-2">
                <div className="flex flex-col gap-3 rounded-2xl border border-[#3453a7]/20 bg-[#fafcff] p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-bold text-[#1a2332]">رفع ملف إكسل</p>
                    <p className="text-xs text-neutral-500">الأعمدة المدعومة: اسم المعلم، رقم الهوية، الحلقة.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#3453a7]/40 bg-white px-4 py-2 text-sm font-semibold text-[#4f73d1] transition-colors hover:bg-[#3453a7]/10">
                    <Upload className="h-4 w-4" />
                    رفع إكسل
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportTeachersFile} />
                  </label>
                </div>

                <div className="space-y-3">
                  {bulkTeachers.map((draft, index) => (
                    <div key={draft.id} className="rounded-2xl border border-[#3453a7]/20 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-[#1a2332]">المعلم {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeBulkTeacherRow(draft.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
                          <Input value={draft.name} onChange={(event) => updateBulkTeacher(draft.id, { name: event.target.value })} placeholder="اسم المعلم" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
                          <Input value={draft.idNumber} onChange={(event) => updateBulkTeacher(draft.id, { idNumber: event.target.value })} placeholder="رقم الهوية" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
                          <Input value={draft.accountNumber} onChange={(event) => updateBulkTeacher(draft.id, { accountNumber: event.target.value })} placeholder="رقم الحساب" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
                          <Input value={draft.phoneNumber} onChange={(event) => updateBulkTeacher(draft.id, { phoneNumber: event.target.value })} placeholder="اختياري" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                          <Select value={draft.selectedHalaqah} onValueChange={(value) => updateBulkTeacher(draft.id, { selectedHalaqah: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختيار" />
                            </SelectTrigger>
                            <SelectContent>
                              {circles.map((circle) => (
                                <SelectItem key={`${draft.id}-${circle.id}`} value={circle.name}>{circle.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-[#1a2332]">المسمى الوظيفي</Label>
                          <Select value={draft.role} onValueChange={(value) => updateBulkTeacher(draft.id, { role: value as "teacher" | "deputy_teacher" })}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المسمى" />
                            </SelectTrigger>
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

                <div className="flex justify-start">
                  <Button type="button" variant="outline" onClick={addBulkTeacherRow} className="border-[#3453a7]/50 text-[#4f73d1] hover:bg-[#3453a7]/10">
                    <Plus className="me-2 h-4 w-4" />
                    إضافة صف جديد
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
                <Button onClick={handleBulkAddTeachers} disabled={isSavingBulk} className="border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] disabled:cursor-not-allowed disabled:opacity-60">{isSavingBulk ? "جاري الإضافة..." : "إضافة المعلمين"}</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl" style={{ zIndex: 110 }}>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">تعديل معلومات المعلم</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 text-right">تعديل بيانات المعلم {editingTeacher?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="editTeacherName" className="text-sm font-semibold text-[#1a2332]">اسم المعلم</Label>
              <Input id="editTeacherName" value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)} placeholder="أدخل اسم المعلم" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeacherAccountNumber" className="text-sm font-semibold text-[#1a2332]">رقم الحساب</Label>
              <Input id="editTeacherAccountNumber" value={editTeacherAccountNumber} onChange={(e) => setEditTeacherAccountNumber(e.target.value)} placeholder="أدخل رقم الحساب" dir="ltr" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIdNumber" className="text-sm font-semibold text-[#1a2332]">رقم الهوية</Label>
              <Input id="editIdNumber" value={editIdNumber} onChange={(e) => setEditIdNumber(e.target.value)} placeholder="أدخل رقم الهوية" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhoneNumber" className="text-sm font-semibold text-[#1a2332]">رقم الجوال</Label>
              <Input id="editPhoneNumber" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="أدخل رقم الجوال" dir="ltr" />
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
              <Select value={editTeacherRole} onValueChange={(value) => setEditTeacherRole(value as "teacher" | "deputy_teacher")} dir="rtl">
                <SelectTrigger id="editTeacherRole"><SelectValue placeholder="اختر المسمى" /></SelectTrigger>
                <SelectContent style={{ zIndex: 120 }}>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="deputy_teacher">نائب معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">
              {isSavingEdit ? (
                <span className="flex items-center gap-2">
                  <SiteLoader size="sm" />
                  جاري الحفظ...
                </span>
              ) : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
