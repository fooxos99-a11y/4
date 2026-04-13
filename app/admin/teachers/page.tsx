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
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ArrowRight, Settings, Users, User, Edit2, Upload } from 'lucide-react'
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
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

type AddTeacherDialogView = "options" | "single" | "bulk"

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
  const [addDialogView, setAddDialogView] = useState<AddTeacherDialogView>("options")
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editIdNumber, setEditIdNumber] = useState("")
  const [bulkTeachers, setBulkTeachers] = useState<BulkTeacherDraft[]>([createBulkTeacherDraft()])
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
          setAddDialogView("options")
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
      setAddDialogView("options")
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

            <button
              type="button"
              onClick={() => {
                setAddDialogView("options")
                setIsAddDialogOpen(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-semibold transition-colors outline-none focus-visible:outline-none focus-visible:ring-0"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </button>

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) {
                setAddDialogView("options")
              }
            }}>
              <DialogContent className={addDialogView === "bulk" ? "sm:max-w-[1100px] max-h-[90vh] overflow-y-auto" : addDialogView === "single" ? "sm:max-w-[480px]" : "sm:max-w-[420px]"}>
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#1a2332]">
                    {addDialogView === "bulk" ? "إضافة جماعية للمعلمين" : addDialogView === "single" ? "إضافة معلم جديد" : "إضافة معلم"}
                  </DialogTitle>
                  {addDialogView === "options" ? (
                    <DialogDescription className="text-right text-sm leading-7 text-neutral-500">
                      اختر بين إضافة معلم واحد أو إضافة جماعية من خلال الإدخال اليدوي أو ملف إكسل.
                    </DialogDescription>
                  ) : addDialogView === "bulk" ? (
                    <DialogDescription className="text-right text-sm leading-7 text-neutral-500">
                      يمكنك الإدخال اليدوي أو رفع ملف إكسل. عند الرفع سيتم أخذ اسم المعلم ورقم الهوية وتحويله تلقائيًا إلى رقم الحساب، وسيبقى اختيار الحلقة فارغًا إلا إذا تم العثور على حلقة مطابقة أو قريبة جدًا.
                    </DialogDescription>
                  ) : null}
                </DialogHeader>

                {addDialogView === "options" ? (
                  <div className="grid gap-3 py-2">
                    <button
                      type="button"
                      onClick={() => setAddDialogView("single")}
                      className="flex items-center justify-between rounded-2xl border border-[#3453a7]/20 bg-[#f8fbff] px-4 py-4 text-right transition-colors hover:bg-[#eef4ff] outline-none focus-visible:outline-none focus-visible:ring-0"
                    >
                      <Plus className="h-5 w-5 text-[#3453a7]" />
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-[#1a2332]">إضافة معلم</div>
                        <div className="text-xs text-neutral-500">إضافة سجل واحد بشكل يدوي.</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddDialogView("bulk")}
                      className="flex items-center justify-between rounded-2xl border border-[#3453a7]/20 bg-white px-4 py-4 text-right transition-colors hover:bg-[#f8fbff] outline-none focus-visible:outline-none focus-visible:ring-0"
                    >
                      <Upload className="h-5 w-5 text-[#3453a7]" />
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-[#1a2332]">إضافة جماعية</div>
                        <div className="text-xs text-neutral-500">رفع إكسل أو إدخال عدة معلمين دفعة واحدة.</div>
                      </div>
                    </button>
                  </div>
                ) : null}

                {addDialogView === "single" ? (
                  <>
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
                      <Button variant="outline" onClick={() => setAddDialogView("options")} className="border-[#3453a7]/50 text-neutral-600">رجوع</Button>
                      <Button onClick={handleAddTeacher} disabled={isSavingAdd} className="border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] disabled:cursor-not-allowed disabled:opacity-60">{isSavingAdd ? "جاري الحفظ..." : "حفظ"}</Button>
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
                      <Button variant="outline" onClick={() => setAddDialogView("options")} className="border-[#3453a7]/50 text-neutral-600">رجوع</Button>
                      <Button onClick={handleBulkAddTeachers} disabled={isSavingBulk} className="border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] disabled:cursor-not-allowed disabled:opacity-60">{isSavingBulk ? "جاري الإضافة..." : "إضافة المعلمين"}</Button>
                    </div>
                  </>
                ) : null}
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
