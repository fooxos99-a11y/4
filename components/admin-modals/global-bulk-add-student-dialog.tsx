"use client"

import React, { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"
import { Plus, Upload, Users } from "lucide-react"

type BulkRow = { name: string; idNumber: string; account: string; guardianPhone: string }

const IMPORT_HEADER_ALIASES = {
  name: ["الاسم", "اسم", "اسم الطالب", "studentname", "student", "name"],
  id_number: ["رقمالهوية", "الهوية", "هوية", "idnumber", "id_number", "id"],
  account_number: ["رقمالحساب", "الحساب", "accountnumber", "account_number", "account"],
  guardian_phone: ["رقموليالأمر", "جوالوليالأمر", "جوالالولي", "رقمالجوال", "الجوال", "رقمواليمر", "guardianphone", "guardian_phone", "parentphone", "phone", "mobile"],
}

const normalizeImportHeader = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "")

const emptyRows = (): BulkRow[] => Array.from({ length: 10 }, () => ({ name: "", idNumber: "", account: "", guardianPhone: "" }))

const isRowUsed = (row: BulkRow) => Boolean(row.name.trim() || row.idNumber.trim() || row.account.trim() || row.guardianPhone.trim())

const isRowComplete = (row: BulkRow) => Boolean(row.name.trim() && (row.account.trim() || row.idNumber.trim()))

const normalizeLocalizedDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0)

    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660)
    }

    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0)
    }

    return digit
  })

const normalizeNumericField = (value: string) => normalizeLocalizedDigits(value).replace(/\s+/g, "").trim()

const extractDigits = (value: string) => normalizeNumericField(value).replace(/\D/g, "")

const isLikelyGuardianPhone = (value: string) => /^(?:9665\d{8}|05\d{8}|5\d{8})$/.test(extractDigits(value))

const isLikelyIdentityNumber = (value: string) => /^1\d{9,}$/.test(extractDigits(value))

const isNumericCell = (value: string) => {
  const normalizedValue = normalizeNumericField(value).replace(/^\+/, "")
  const digits = extractDigits(value)

  return Boolean(digits) && digits.length === normalizedValue.length
}

const isLikelyName = (value: string) => /[A-Za-z\u0600-\u06FF]/.test(value)

const updateBulkRow = (rows: BulkRow[], rowIndex: number, updates: Partial<BulkRow>) => rows.map((row, index) => (index === rowIndex ? { ...row, ...updates } : row))

const getRowIssues = (row: BulkRow) => {
  const issues: string[] = []

  if (!row.name.trim()) {
    issues.push("الاسم مطلوب")
  }

  if (!row.account.trim() && !row.idNumber.trim()) {
    issues.push("رقم الهوية أو رقم الحساب مطلوب")
  }

  return issues
}

const summarizeClientRows = (rows: Array<{ rowNumber: number; name: string; issues: string[] }>) =>
  rows
    .slice(0, 4)
    .map((row) => `السطر ${row.rowNumber}${row.name ? ` (${row.name})` : ""}: ${row.issues.join("، ")}`)
    .join(" | ")

const summarizeRejectedRows = (rejectedRows: Array<{ rowNumber: number; name: string; reason: string }> = []) =>
  rejectedRows
    .slice(0, 4)
    .map((row) => `السطر ${row.rowNumber}${row.name ? ` (${row.name})` : ""}: ${row.reason}`)
    .join(" | ")

const normalizeBulkRow = (row: BulkRow): BulkRow => ({
  name: row.name.trim(),
  idNumber: extractDigits(row.idNumber),
  account: extractDigits(row.account),
  guardianPhone: row.guardianPhone.trim()
    ? (() => {
        try {
          return normalizeGuardianPhoneForStorage(row.guardianPhone)
        } catch {
          return extractDigits(row.guardianPhone)
        }
      })()
    : "",
})

const parseStudentImportRows = (sheetRows: string[][]): BulkRow[] => {
  const rows = sheetRows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell !== ""))

  if (rows.length === 0) return []

  const firstRow = rows[0]
  const normalizedHeaders = firstRow.map(normalizeImportHeader)
  const headerIndexes = {
    name: normalizedHeaders.findIndex((header) => IMPORT_HEADER_ALIASES.name.includes(header)),
    id_number: normalizedHeaders.findIndex((header) => IMPORT_HEADER_ALIASES.id_number.includes(header)),
    account_number: normalizedHeaders.findIndex((header) => IMPORT_HEADER_ALIASES.account_number.includes(header)),
    guardian_phone: normalizedHeaders.findIndex((header) => IMPORT_HEADER_ALIASES.guardian_phone.includes(header)),
  }

  const hasHeaderRow = Object.values(headerIndexes).some((index) => index >= 0)
  const dataRows = hasHeaderRow ? rows.slice(1) : rows

  return dataRows.map((row) => {
    const nextRow: BulkRow = { name: "", idNumber: "", account: "", guardianPhone: "" }
    const consumedIndexes = new Set<number>()

    const assignFromHeader = (field: keyof typeof headerIndexes, targetKey: keyof BulkRow) => {
      const fieldIndex = headerIndexes[field]
      if (hasHeaderRow && fieldIndex >= 0) {
        const rawValue = String(row[fieldIndex] || "").trim()
        nextRow[targetKey] = targetKey === "name" ? rawValue : extractDigits(rawValue)
        consumedIndexes.add(fieldIndex)
      }
    }

    assignFromHeader("name", "name")
    assignFromHeader("id_number", "idNumber")
    assignFromHeader("account_number", "account")
    assignFromHeader("guardian_phone", "guardianPhone")

    row.forEach((cellValue, cellIndex) => {
      if (consumedIndexes.has(cellIndex)) return

      const rawValue = String(cellValue || "").trim()
      if (!rawValue) return

      const digits = extractDigits(rawValue)

      if (isLikelyGuardianPhone(rawValue) && !nextRow.guardianPhone) {
        nextRow.guardianPhone = digits
        return
      }

      if (isLikelyIdentityNumber(rawValue)) {
        if (!nextRow.idNumber) nextRow.idNumber = digits
        if (!nextRow.account) nextRow.account = digits
        return
      }

      if (isNumericCell(rawValue)) {
        if (!nextRow.account) {
          nextRow.account = digits || rawValue
          return
        }

        if (!nextRow.idNumber) {
          nextRow.idNumber = digits || rawValue
          return
        }
      }

      if (isLikelyName(rawValue) && !nextRow.name) {
        nextRow.name = rawValue
      }
    })

    if (nextRow.idNumber && !nextRow.account) {
      nextRow.account = nextRow.idNumber
    }

    if (nextRow.account && !nextRow.idNumber && isLikelyIdentityNumber(nextRow.account)) {
      nextRow.idNumber = nextRow.account
    }

    return normalizeBulkRow(nextRow)
  })
}

export function GlobalBulkAddStudentDialog() {
  const router = useRouter()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<any[]>([])
  
  const [bulkCircle, setBulkCircle] = useState("")
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(emptyRows())
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  useEffect(() => {
    void fetchCircles()
  }, [])

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles", { cache: "no-store" })
      const data = await response.json()
      if (response.ok && Array.isArray(data.circles)) {
        setCircles(data.circles)
      }
    } catch (e) { console.error(e) }
  }

  const handleClose = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
       router.push(window.location.pathname, { scroll: false })
    }
  }

  const handleBulkAddStudents = async () => {
    const normalizedRows = bulkRows.map(normalizeBulkRow)
    const usedRows = normalizedRows.filter(isRowUsed)

    if (!bulkCircle || usedRows.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار الحلقة وإدخال اسم طالب واحد على الأقل", variant: "destructive" })
      return
    }

    const incompleteRows = normalizedRows
      .map((row, index) => ({ rowNumber: index + 1, name: row.name.trim(), issues: isRowUsed(row) ? getRowIssues(row) : [] }))
      .filter((row) => row.issues.length > 0)

    if (incompleteRows.length > 0) {
      toast({
        title: "بيانات ناقصة",
        description: summarizeClientRows(incompleteRows) || "يجب إكمال الاسم ورقم الهوية أو رقم الحساب لكل صف قبل الحفظ",
        variant: "destructive",
      })
      return
    }

    setIsBulkSubmitting(true)
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circle_name: bulkCircle,
          students: usedRows.map((row) => ({
            name: row.name.trim(),
            id_number: row.idNumber.trim() || row.account.trim() || null,
            account_number: row.account.trim() || null,
            guardian_phone: row.guardianPhone.trim() || null,
          })),
        }),
      })

      const data = await res.json()

      const insertedCount = Number(data.insertedCount || 0)
      const rejectedCount = Number(data.rejectedCount || 0)
      const rejectedSummary = summarizeRejectedRows(data.rejectedRows)

      if (!res.ok) {
        toast({
          title: "فشل الحفظ",
          description: data.error || rejectedSummary || "حدث خطأ أثناء الاستيراد الجماعي",
          variant: "destructive",
        })
        return
      }

      if (insertedCount > 0 && rejectedCount === 0) {
        toast({
          title: `✓ تم إضافة ${insertedCount} طالب`,
        })
      } else if (insertedCount > 0 && rejectedCount > 0) {
        toast({
          title: `تمت إضافة ${insertedCount} طالب وتعذر ${rejectedCount} صف`,
          description: rejectedSummary || "تحقق من بيانات الصفوف المرفوضة",
          variant: "destructive",
        })
      } else {
        toast({
          title: "لم يتم الحفظ",
          description: rejectedSummary || "كل الصفوف مرفوضة. تحقق من رقم الحساب أو الهوية",
          variant: "destructive",
        })
      }

      if (insertedCount > 0) {
        handleClose(false)
      }
    } catch {
      toast({ title: "فشل الحفظ", description: "حدث خطأ أثناء الاستيراد الجماعي", variant: "destructive" })
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) {
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        toast({ title: "خطأ", description: "الملف لا يحتوي على أي ورقة", variant: "destructive" })
        return
      }

      const sheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      })

      const importedRows = parseStudentImportRows(rows as string[][]).filter((row) => row.name || row.idNumber || row.account || row.guardianPhone)
      if (importedRows.length === 0) {
        toast({ title: "تنبيه", description: "لم يتم العثور على بيانات طلاب داخل الملف", variant: "destructive" })
        return
      }

      setBulkRows([...importedRows, ...emptyRows()].slice(0, Math.max(importedRows.length, 10)))
      toast({ title: "تمت القراءة", description: `تمت تعبئة ${importedRows.length} صف من الملف` })
    } catch {
      toast({ title: "خطأ", description: "تعذر قراءة الملف. تأكد أنه Excel أو CSV صالح", variant: "destructive" })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="relative w-full text-center text-xl text-[#1a2332]">
            <span className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 text-[#4f73d1]">
              <Users className="h-5 w-5" />
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            </span>
            <span>إضافة جماعية للطلاب</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* اختيار الحلقة */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-600">اسم الحلقة</Label>
            <Select value={bulkCircle} onValueChange={setBulkCircle} dir="rtl">
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="اختر الحلقة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {circles.map((circle) => (
                  <SelectItem key={circle.name} value={circle.name}>{circle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* صف العناوين */}
          <div className="grid grid-cols-4 gap-2 mb-1">
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">اسم الطالب</span>
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">رقم الهوية</span>
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">رقم الحساب</span>
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">رقم ولي الأمر</span>
          </div>
          {/* صفوف الطلاب */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                <Input
                  placeholder={`اسم الطالب ${idx + 1}`}
                  value={row.name}
                  onChange={e => setBulkRows(prev => updateBulkRow(prev, idx, { name: e.target.value }))}
                  className="text-sm h-9"
                  dir="rtl"
                />
                <Input
                  placeholder="رقم الهوية"
                  value={row.idNumber}
                  onChange={e => setBulkRows(prev => updateBulkRow(prev, idx, { idNumber: extractDigits(e.target.value) }))}
                  className="text-sm h-9 text-right"
                  dir="ltr"
                  inputMode="numeric"
                />
                <Input
                  placeholder="رقم الحساب"
                  value={row.account}
                  onChange={e => setBulkRows(prev => prev.map((r, i) => {
                    if (i !== idx) return r

                    const nextAccount = extractDigits(e.target.value)
                    const shouldSyncId = !r.idNumber.trim() || r.idNumber === r.account

                    return {
                      ...r,
                      account: nextAccount,
                      idNumber: shouldSyncId ? nextAccount : r.idNumber,
                    }
                  }))}
                  className="text-sm h-9 flex-row-reverse text-right"
                  dir="ltr"
                  inputMode="numeric"
                />
                <Input
                  placeholder="رقم ولي الأمر"
                  value={row.guardianPhone}
                  onChange={e => setBulkRows(prev => updateBulkRow(prev, idx, { guardianPhone: extractDigits(e.target.value) }))}
                  className="text-sm h-9 text-right"
                  dir="ltr"
                  inputMode="numeric"
                />
              </div>
            ))}
          </div>
          {/* زر إضافة صف */}
          <button
            type="button"
            onClick={() => setBulkRows(prev => [...prev, { name: "", idNumber: "", account: "", guardianPhone: "" }])}
            className="flex items-center gap-2 text-sm text-[#4f73d1] hover:text-[#3453a7] font-medium transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
              <Plus className="h-3.5 w-3.5" />
            </span>
            إضافة طالب
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4f73d1] hover:text-[#3453a7] font-medium transition-colors w-fit">
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => void handleImportFile(e.target.files?.[0] || null)} />
            <Upload className="h-4 w-4" />
            رفع ملف إكسيل
          </label>
          <p className="text-xs text-neutral-500 leading-6">
            يمكنك تصدير بيانات الطلاب من ناظم ورفعها هنا مباشرة.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
          <Button
            onClick={handleBulkAddStudents}
            disabled={!bulkCircle || bulkRows.every((row) => !isRowUsed(row)) || isBulkSubmitting}
            className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none text-sm h-9 rounded-lg font-medium disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
          >
            {isBulkSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
