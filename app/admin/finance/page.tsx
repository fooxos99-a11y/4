"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BriefcaseBusiness,
  Bus,
  CircleDollarSign,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { createClient } from "@/lib/supabase/client"

type DateFilter = "today" | "currentWeek" | "currentMonth" | "all" | "custom"
type FinanceSection = "overview" | "invoices" | "expenses" | "incomes" | "trips"
type EditableSection = Exclude<FinanceSection, "overview">

type InvoiceStatus = "paid" | "unpaid" | "overdue"

type InvoiceRecord = {
  id: string
  title: string
  vendor: string
  invoiceNumber: string
  amount: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
}

type ExpenseRecord = {
  id: string
  title: string
  amount: number
  date: string
  paymentMethod: string
  beneficiary: string
}

type IncomeRecord = {
  id: string
  title: string
  source: string
  amount: number
  date: string
}

type TripRecord = {
  id: string
  title: string
  date: string
  costs: number[]
}

type ActiveSemesterRow = {
  id: string
}

type InvoiceDraft = {
  title: string
  vendor: string
  invoiceNumber: string
  amount: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
}

type ExpenseDraft = {
  title: string
  beneficiary: string
  paymentMethod: string
  amount: string
  date: string
}

type IncomeDraft = {
  title: string
  source: string
  amount: string
  date: string
}

type TripDraft = {
  title: string
  date: string
  costs: string[]
}

type InvoiceRow = {
  id: string
  title: string | null
  vendor: string | null
  invoice_number: string | null
  amount: number | string | null
  issue_date: string
  due_date: string
  status: InvoiceStatus | null
}

type ExpenseRow = {
  id: string
  title: string | null
  beneficiary: string | null
  payment_method: string | null
  amount: number | string | null
  expense_date: string
}

type IncomeRow = {
  id: string
  title: string | null
  source: string | null
  amount: number | string | null
  income_date: string
}

type TripRow = {
  id: string
  title: string | null
  trip_date: string
  costs: unknown
}

const FILTER_LABELS: Record<DateFilter, string> = {
  today: "اليوم",
  currentWeek: "الأسبوع الحالي",
  currentMonth: "الشهر الحالي",
  all: "كل الفترات",
  custom: "مخصص",
}

const SECTION_LABELS: Array<{ key: FinanceSection; label: string }> = [
  { key: "overview", label: "الملخص" },
  { key: "invoices", label: "الفواتير" },
  { key: "expenses", label: "المصروفات" },
  { key: "incomes", label: "الإيرادات" },
  { key: "trips", label: "الرحلات" },
]

const fieldClassName = "h-11 rounded-xl border border-[#d8e4fb] bg-white px-3 text-sm font-semibold text-[#1f2937] outline-none focus:border-[#3453a7]"

function getDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10)
}

function createRecordId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultInvoiceDraft(today: string): InvoiceDraft {
  return {
    title: "",
    vendor: "",
    invoiceNumber: "",
    amount: "",
    issueDate: today,
    dueDate: today,
    status: "unpaid",
  }
}

function getDefaultExpenseDraft(today: string): ExpenseDraft {
  return {
    title: "",
    beneficiary: "",
    paymentMethod: "",
    amount: "",
    date: today,
  }
}

function getDefaultIncomeDraft(today: string): IncomeDraft {
  return {
    title: "",
    source: "",
    amount: "",
    date: today,
  }
}

function getDefaultTripDraft(today: string): TripDraft {
  return {
    title: "",
    date: today,
    costs: [""],
  }
}

function normalizeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function getCurrentWeekRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getDateRange(filter: DateFilter, customStart: string, customEnd: string) {
  const today = new Date()
  const end = new Date()
  const start = new Date()

  if (filter === "today") {
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }

  if (filter === "currentWeek") {
    return getCurrentWeekRange()
  }

  if (filter === "currentMonth") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }

  if (filter === "custom") {
    return {
      start: new Date(`${customStart}T00:00:00`),
      end: new Date(`${customEnd}T23:59:59`),
    }
  }

  start.setFullYear(2020, 0, 1)
  start.setHours(0, 0, 0, 0)
  today.setHours(23, 59, 59, 999)
  return { start, end: today }
}

function isWithinRange(dateValue: string, start: Date, end: Date) {
  const target = normalizeDate(dateValue)
  const normalizedStart = normalizeDate(start)
  const normalizedEnd = normalizeDate(end)
  return target >= normalizedStart && target <= normalizedEnd
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function parseNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeTripCosts(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
}

function mapInvoiceRow(row: InvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    title: row.title?.trim() || "-",
    vendor: row.vendor?.trim() || "",
    invoiceNumber: row.invoice_number?.trim() || "",
    amount: Number(row.amount ?? 0),
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: row.status ?? "unpaid",
  }
}

function mapExpenseRow(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    title: row.title?.trim() || "-",
    beneficiary: row.beneficiary?.trim() || "",
    paymentMethod: row.payment_method?.trim() || "",
    amount: Number(row.amount ?? 0),
    date: row.expense_date,
  }
}

function mapIncomeRow(row: IncomeRow): IncomeRecord {
  return {
    id: row.id,
    title: row.title?.trim() || "-",
    source: row.source?.trim() || "",
    amount: Number(row.amount ?? 0),
    date: row.income_date,
  }
}

function mapTripRow(row: TripRow): TripRecord {
  return {
    id: row.id,
    title: row.title?.trim() || "-",
    date: row.trip_date,
    costs: normalizeTripCosts(row.costs),
  }
}

function getInvoiceStatusBadge(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">مدفوعة</Badge>
    case "overdue":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">متأخرة</Badge>
    default:
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">غير مدفوعة</Badge>
  }
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: typeof Wallet
  tone: string
}) {
  return (
    <Card className="overflow-hidden border-[#dbe5f5] shadow-sm">
      <CardContent className="p-0">
        <div className={`flex items-center justify-between px-5 py-5 ${tone}`}>
          <div>
            <div className="text-sm font-bold text-[#6b7280]">{title}</div>
            <div className="mt-2 text-2xl font-black text-[#1a2332]">{value}</div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
            <Icon className="h-6 w-6 text-[#1a2332]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={active ? "border-[#3453a7] bg-[#3453a7] text-white hover:bg-[#28448e] hover:text-white" : "border-[#d8e4fb] bg-white text-[#3453a7] hover:border-[#3453a7]/50 hover:bg-[#f8fbff]"}
    >
      {label}
    </Button>
  )
}

function SectionActions({
  onAdd,
}: {
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="h-9 w-9 rounded-full border-[#3453a7] bg-white p-0 text-[#3453a7] hover:bg-[#f8fbff]"
        aria-label="إضافة عنصر جديد"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function FinancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("المالية")
  const { toast } = useToast()
  const todayDate = getDateInputValue(new Date())

  const [dateFilter, setDateFilter] = useState<DateFilter>("currentMonth")
  const [activeSection, setActiveSection] = useState<FinanceSection>("overview")
  const [customStart, setCustomStart] = useState(getDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState(todayDate)
  const [financeLoading, setFinanceLoading] = useState(true)
  const [activeSemesterId, setActiveSemesterId] = useState("")

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [trips, setTrips] = useState<TripRecord[]>([])

  const [dialogSection, setDialogSection] = useState<EditableSection | null>(null)
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>(() => getDefaultInvoiceDraft(todayDate))
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => getDefaultExpenseDraft(todayDate))
  const [incomeDraft, setIncomeDraft] = useState<IncomeDraft>(() => getDefaultIncomeDraft(todayDate))
  const [tripDraft, setTripDraft] = useState<TripDraft>(() => getDefaultTripDraft(todayDate))

  useEffect(() => {
    if (!authVerified) {
      return
    }

    let isMounted = true

    async function fetchFinanceData() {
      setFinanceLoading(true)

      try {
        const supabase = createClient()
        const { data: semesterData, error: semesterError } = await supabase
          .from("semesters")
          .select("id")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (semesterError) throw semesterError

        const semesterId = (semesterData as ActiveSemesterRow | null)?.id || ""

        if (isMounted) {
          setActiveSemesterId(semesterId)
        }

        const [invoicesResult, expensesResult, incomesResult, tripsResult] = await Promise.all([
          supabase.from("finance_invoices").select("id, title, vendor, invoice_number, amount, issue_date, due_date, status").eq("semester_id", semesterId).order("created_at", { ascending: false }),
          supabase.from("finance_expenses").select("id, title, beneficiary, payment_method, amount, expense_date").eq("semester_id", semesterId).order("created_at", { ascending: false }),
          supabase.from("finance_incomes").select("id, title, source, amount, income_date").eq("semester_id", semesterId).order("created_at", { ascending: false }),
          supabase.from("finance_trips").select("id, title, trip_date, costs").eq("semester_id", semesterId).order("created_at", { ascending: false }),
        ])

        if (invoicesResult.error) throw invoicesResult.error
        if (expensesResult.error) throw expensesResult.error
        if (incomesResult.error) throw incomesResult.error
        if (tripsResult.error) throw tripsResult.error

        if (!isMounted) {
          return
        }

        setInvoices(((invoicesResult.data ?? []) as InvoiceRow[]).map(mapInvoiceRow))
        setExpenses(((expensesResult.data ?? []) as ExpenseRow[]).map(mapExpenseRow))
        setIncomes(((incomesResult.data ?? []) as IncomeRow[]).map(mapIncomeRow))
        setTrips(((tripsResult.data ?? []) as TripRow[]).map(mapTripRow))
      } catch (error) {
        const description = error instanceof Error ? error.message : "تعذر تحميل بيانات المالية"

        if (isMounted) {
          toast({
            title: "تعذر تحميل بيانات المالية",
            description,
            variant: "destructive",
          })
        }
      } finally {
        if (isMounted) {
          setFinanceLoading(false)
        }
      }
    }

    void fetchFinanceData()

    return () => {
      isMounted = false
    }
  }, [authVerified])

  const { start, end } = useMemo(() => getDateRange(dateFilter, customStart, customEnd), [dateFilter, customEnd, customStart])

  const filteredInvoices = useMemo(
    () => invoices.filter((item) => isWithinRange(item.issueDate, start, end)),
    [end, invoices, start],
  )
  const filteredExpenses = useMemo(
    () => expenses.filter((item) => isWithinRange(item.date, start, end)),
    [end, expenses, start],
  )
  const filteredIncomes = useMemo(
    () => incomes.filter((item) => isWithinRange(item.date, start, end)),
    [end, incomes, start],
  )
  const filteredTrips = useMemo(
    () => trips.filter((item) => isWithinRange(item.date, start, end)),
    [end, start, trips],
  )

  const totals = useMemo(() => {
    const invoicesOutstanding = filteredInvoices.filter((item) => item.status !== "paid").length
    const expensesTotal = filteredExpenses.reduce((sum, item) => sum + item.amount, 0)
    const incomeTotal = filteredIncomes.reduce((sum, item) => sum + item.amount, 0)
    const tripTotal = filteredTrips.reduce(
      (sum, item) => sum + item.costs.reduce((costSum, cost) => costSum + cost, 0),
      0,
    )

    return {
      invoicesOutstanding,
      expensesTotal,
      incomeTotal,
      tripTotal,
    }
  }, [filteredExpenses, filteredIncomes, filteredInvoices, filteredTrips])

  const openAddDialog = (section: EditableSection) => {
    if (section === "invoices") {
      setInvoiceDraft(getDefaultInvoiceDraft(todayDate))
    }

    if (section === "expenses") {
      setExpenseDraft(getDefaultExpenseDraft(todayDate))
    }

    if (section === "incomes") {
      setIncomeDraft(getDefaultIncomeDraft(todayDate))
    }

    if (section === "trips") {
      setTripDraft(getDefaultTripDraft(todayDate))
    }

    setDialogSection(section)
  }

  const closeDialog = () => {
    setDialogSection(null)
  }

  const handleDeleteRecord = async (section: EditableSection, recordId: string) => {
    const supabase = createClient()

    if (section === "invoices") {
      const { error } = await supabase.from("finance_invoices").delete().eq("id", recordId)
      if (error) {
        toast({ title: "تعذر حذف الفاتورة", description: error.message, variant: "destructive" })
        return
      }

      setInvoices((current) => current.filter((item) => item.id !== recordId))
      return
    }

    if (section === "expenses") {
      const { error } = await supabase.from("finance_expenses").delete().eq("id", recordId)
      if (error) {
        toast({ title: "تعذر حذف المصروف", description: error.message, variant: "destructive" })
        return
      }

      setExpenses((current) => current.filter((item) => item.id !== recordId))
      return
    }

    if (section === "incomes") {
      const { error } = await supabase.from("finance_incomes").delete().eq("id", recordId)
      if (error) {
        toast({ title: "تعذر حذف الإيراد", description: error.message, variant: "destructive" })
        return
      }

      setIncomes((current) => current.filter((item) => item.id !== recordId))
      return
    }

    const { error } = await supabase.from("finance_trips").delete().eq("id", recordId)
    if (error) {
      toast({ title: "تعذر حذف الرحلة أو الفعالية", description: error.message, variant: "destructive" })
      return
    }

    setTrips((current) => current.filter((item) => item.id !== recordId))
  }

  const handleAddRecord = async () => {
    const supabase = createClient()

    if (!activeSemesterId) {
      toast({ title: "تعذر تحديد الفصل النشط", description: "تأكد من وجود فصل نشط ثم أعد المحاولة", variant: "destructive" })
      return
    }

    if (dialogSection === "invoices") {
      if (!invoiceDraft.title.trim()) {
        return
      }

      const { data, error } = await supabase
        .from("finance_invoices")
        .insert({
          title: invoiceDraft.title.trim(),
          vendor: invoiceDraft.vendor.trim() || null,
          invoice_number: invoiceDraft.invoiceNumber.trim() || null,
          amount: parseNumber(invoiceDraft.amount),
          issue_date: invoiceDraft.issueDate,
          due_date: invoiceDraft.dueDate,
          status: invoiceDraft.status,
          semester_id: activeSemesterId,
        })
        .select("id, title, vendor, invoice_number, amount, issue_date, due_date, status")
        .single()

      if (error) {
        toast({ title: "تعذر حفظ الفاتورة", description: error.message, variant: "destructive" })
        return
      }

      setInvoices((current) => [mapInvoiceRow(data as InvoiceRow), ...current])
      closeDialog()
      return
    }

    if (dialogSection === "expenses") {
      if (!expenseDraft.title.trim()) {
        return
      }

      const { data, error } = await supabase
        .from("finance_expenses")
        .insert({
          title: expenseDraft.title.trim(),
          beneficiary: expenseDraft.beneficiary.trim() || null,
          payment_method: expenseDraft.paymentMethod.trim() || null,
          amount: parseNumber(expenseDraft.amount),
          expense_date: expenseDraft.date,
          semester_id: activeSemesterId,
        })
        .select("id, title, beneficiary, payment_method, amount, expense_date")
        .single()

      if (error) {
        toast({ title: "تعذر حفظ المصروف", description: error.message, variant: "destructive" })
        return
      }

      setExpenses((current) => [mapExpenseRow(data as ExpenseRow), ...current])
      closeDialog()
      return
    }

    if (dialogSection === "trips") {
      if (!tripDraft.title.trim()) {
        return
      }

      const parsedCosts = tripDraft.costs.map((cost) => parseNumber(cost)).filter((cost) => cost > 0)
      const { data, error } = await supabase
        .from("finance_trips")
        .insert({
          title: tripDraft.title.trim(),
          trip_date: tripDraft.date,
          costs: parsedCosts,
          semester_id: activeSemesterId,
        })
        .select("id, title, trip_date, costs")
        .single()

      if (error) {
        toast({ title: "تعذر حفظ الرحلة أو الفعالية", description: error.message, variant: "destructive" })
        return
      }

      setTrips((current) => [mapTripRow(data as TripRow), ...current])
      closeDialog()
      return
    }

    if (dialogSection === "incomes") {
      if (!incomeDraft.title.trim()) {
        return
      }

      const { data, error } = await supabase
        .from("finance_incomes")
        .insert({
          title: incomeDraft.title.trim(),
          source: incomeDraft.source.trim() || null,
          amount: parseNumber(incomeDraft.amount),
          income_date: incomeDraft.date,
          semester_id: activeSemesterId,
        })
        .select("id, title, source, amount, income_date")
        .single()

      if (error) {
        toast({ title: "تعذر حفظ الإيراد", description: error.message, variant: "destructive" })
        return
      }

      setIncomes((current) => [mapIncomeRow(data as IncomeRow), ...current])
      closeDialog()
    }
  }

  if (authLoading || !authVerified || financeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf9]" dir="rtl">
        <SiteLoader size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fbff] via-white to-[#f5f9ff] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <section className="rounded-[32px] border border-[#dbe5f5] bg-white/95 p-6 shadow-[0_20px_60px_-45px_rgba(26,35,50,0.45)] backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-3 text-[#1a2332]">
                  <div className="rounded-2xl bg-[#eef4ff] p-3 text-[#3453a7] shadow-sm">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <h1 className="text-3xl font-black md:text-4xl">لوحة المالية</h1>
                </div>
              </div>

              <div className="w-full max-w-xl space-y-3">
                <div>
                  <div className="mb-2 text-sm font-bold text-[#40515b]">الفترة</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {Object.entries(FILTER_LABELS).map(([value, label]) => (
                      <SectionButton
                        key={value}
                        active={dateFilter === value}
                        label={label}
                        onClick={() => setDateFilter(value as DateFilter)}
                      />
                    ))}
                  </div>
                </div>

                {dateFilter === "custom" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} />
                    <Input type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} />
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="إجمالي المصروفات" value={formatCurrency(totals.expensesTotal)} icon={Wallet} tone="bg-[#f8fbff]" />
            <SummaryCard title="إجمالي الإيرادات" value={formatCurrency(totals.incomeTotal)} icon={CircleDollarSign} tone="bg-[#f4f9ff]" />
            <SummaryCard title="فواتير غير مسددة" value={new Intl.NumberFormat("ar-SA").format(totals.invoicesOutstanding)} icon={Receipt} tone="bg-[#f7faff]" />
            <SummaryCard title="تكلفة الرحلات" value={formatCurrency(totals.tripTotal)} icon={Bus} tone="bg-[#f5f8ff]" />
          </section>

          <section className="flex flex-wrap gap-3">
            {SECTION_LABELS.map((item) => (
              <SectionButton
                key={item.key}
                active={activeSection === item.key}
                label={item.label}
                onClick={() => setActiveSection(item.key)}
              />
            ))}
          </section>

          {(activeSection === "overview" || activeSection === "invoices") && (
            <Card className="rounded-[28px] border-[#dbe5f5] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#e9eff8] pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-black text-[#1a2332]">الفواتير</CardTitle>
                  <FileText className="h-5 w-5 text-[#3453a7]" />
                </div>
                <SectionActions
                  onAdd={() => openAddDialog("invoices")}
                />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الفاتورة</TableHead>
                      <TableHead className="text-right">الجهة</TableHead>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الإصدار</TableHead>
                      <TableHead className="text-right">الاستحقاق</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length > 0 ? filteredInvoices.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-right font-bold text-[#1a2332]">{item.title}</TableCell>
                        <TableCell className="text-right">{item.vendor || "-"}</TableCell>
                        <TableCell className="text-right">{item.invoiceNumber || "-"}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-right">{formatDate(item.issueDate)}</TableCell>
                        <TableCell className="text-right">{formatDate(item.dueDate)}</TableCell>
                        <TableCell className="text-right">{getInvoiceStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => { void handleDeleteRecord("invoices", item.id) }}
                            className="h-9 w-9 rounded-full border-[#e5d5d5] p-0 text-[#b42318]"
                            aria-label={`حذف الفاتورة ${item.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm font-semibold text-[#64748b]">
                          لا توجد فواتير في هذه الفترة. استخدم زر + لإضافة فاتورة جديدة.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {(activeSection === "overview" || activeSection === "expenses") && (
            <Card className="rounded-[28px] border-[#dbe5f5] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#e9eff8] pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-black text-[#1a2332]">المصروفات</CardTitle>
                  <BriefcaseBusiness className="h-5 w-5 text-[#3453a7]" />
                </div>
                <SectionActions
                  onAdd={() => openAddDialog("expenses")}
                />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">الجهة المستفيدة</TableHead>
                      <TableHead className="text-right">طريقة الدفع</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length > 0 ? filteredExpenses.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-right font-bold text-[#1a2332]">{item.title}</TableCell>
                        <TableCell className="text-right">{item.beneficiary || "-"}</TableCell>
                        <TableCell className="text-right">{item.paymentMethod || "-"}</TableCell>
                        <TableCell className="text-right">{formatDate(item.date)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => { void handleDeleteRecord("expenses", item.id) }}
                            className="h-9 w-9 rounded-full border-[#e5d5d5] p-0 text-[#b42318]"
                            aria-label={`حذف المصروف ${item.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm font-semibold text-[#64748b]">
                          لا توجد مصروفات في هذه الفترة. استخدم زر + لإضافة مصروف جديد.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {(activeSection === "overview" || activeSection === "incomes") && (
            <Card className="rounded-[28px] border-[#dbe5f5] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#e9eff8] pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-black text-[#1a2332]">الإيرادات</CardTitle>
                  <CircleDollarSign className="h-5 w-5 text-[#3453a7]" />
                </div>
                <SectionActions
                  onAdd={() => openAddDialog("incomes")}
                />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">المصدر</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomes.length > 0 ? filteredIncomes.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-right font-bold text-[#1a2332]">{item.title}</TableCell>
                        <TableCell className="text-right">{item.source || "-"}</TableCell>
                        <TableCell className="text-right">{formatDate(item.date)}</TableCell>
                        <TableCell className="text-right font-bold text-[#3453a7]">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => { void handleDeleteRecord("incomes", item.id) }}
                            className="h-9 w-9 rounded-full border-[#e5d5d5] p-0 text-[#b42318]"
                            aria-label={`حذف الإيراد ${item.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm font-semibold text-[#64748b]">
                          لا توجد إيرادات في هذه الفترة. استخدم زر + لإضافة إيراد جديد.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {(activeSection === "overview" || activeSection === "trips") && (
            <Card className="rounded-[28px] border-[#dbe5f5] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#e9eff8] pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-black text-[#1a2332]">الرحلات والفعاليات</CardTitle>
                  <Bus className="h-5 w-5 text-[#3453a7]" />
                </div>
                <SectionActions
                  onAdd={() => openAddDialog("trips")}
                />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredTrips.length > 0 ? filteredTrips.map((trip) => {
                    const totalCost = trip.costs.reduce((sum, cost) => sum + cost, 0)

                    return (
                      <div key={trip.id} className="rounded-[24px] border border-[#dbe5f5] bg-[#f8fbff] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-right">
                            <div className="text-lg font-black text-[#1a2332]">{trip.title}</div>
                            <div className="mt-1 text-sm font-semibold text-[#6b7280]">{formatDate(trip.date)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-white text-[#3453a7] hover:bg-white">{formatCurrency(totalCost)}</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { void handleDeleteRecord("trips", trip.id) }}
                              className="h-9 w-9 rounded-full border-[#e5d5d5] bg-white p-0 text-[#b42318]"
                              aria-label={`حذف الرحلة أو الفعالية ${trip.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm font-semibold text-[#445164]">
                          {trip.costs.map((cost, index) => (
                            <div key={`${trip.id}-cost-${index}`} className="rounded-2xl bg-white px-4 py-3">
                              تكلفة {new Intl.NumberFormat("ar-SA").format(index + 1)}: {formatCurrency(cost)}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-base font-black text-[#1a2332]">الإجمالي: {formatCurrency(totalCost)}</span>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="rounded-[24px] border border-dashed border-[#d8e4fb] bg-[#f8fbff] px-6 py-10 text-center text-sm font-semibold text-[#64748b] lg:col-span-2">
                      لا توجد رحلات أو فعاليات في هذه الفترة. استخدم زر + لإضافة رحلة أو فعالية.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={dialogSection !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {dialogSection === "invoices" ? "إضافة فاتورة" : dialogSection === "expenses" ? "إضافة مصروف" : dialogSection === "incomes" ? "إضافة إيراد" : "إضافة رحلة أو فعالية"}
            </DialogTitle>
          </DialogHeader>

          {dialogSection === "invoices" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="اسم الفاتورة" value={invoiceDraft.title} onChange={(event) => setInvoiceDraft((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="الجهة" value={invoiceDraft.vendor} onChange={(event) => setInvoiceDraft((current) => ({ ...current, vendor: event.target.value }))} />
              <Input placeholder="رقم الفاتورة" value={invoiceDraft.invoiceNumber} onChange={(event) => setInvoiceDraft((current) => ({ ...current, invoiceNumber: event.target.value }))} />
              <Input placeholder="المبلغ" type="number" min="0" value={invoiceDraft.amount} onChange={(event) => setInvoiceDraft((current) => ({ ...current, amount: event.target.value }))} />
              <Input type="date" value={invoiceDraft.issueDate} onChange={(event) => setInvoiceDraft((current) => ({ ...current, issueDate: event.target.value }))} />
              <Input type="date" value={invoiceDraft.dueDate} onChange={(event) => setInvoiceDraft((current) => ({ ...current, dueDate: event.target.value }))} />
              <select className={fieldClassName} value={invoiceDraft.status} onChange={(event) => setInvoiceDraft((current) => ({ ...current, status: event.target.value as InvoiceStatus }))}>
                <option value="unpaid">غير مدفوعة</option>
                <option value="paid">مدفوعة</option>
                <option value="overdue">متأخرة</option>
              </select>
            </div>
          ) : null}

          {dialogSection === "expenses" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="وصف المصروف" value={expenseDraft.title} onChange={(event) => setExpenseDraft((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="الجهة المستفيدة" value={expenseDraft.beneficiary} onChange={(event) => setExpenseDraft((current) => ({ ...current, beneficiary: event.target.value }))} />
              <Input placeholder="طريقة الدفع" value={expenseDraft.paymentMethod} onChange={(event) => setExpenseDraft((current) => ({ ...current, paymentMethod: event.target.value }))} />
              <Input placeholder="المبلغ" type="number" min="0" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))} />
              <Input type="date" value={expenseDraft.date} onChange={(event) => setExpenseDraft((current) => ({ ...current, date: event.target.value }))} />
            </div>
          ) : null}

          {dialogSection === "incomes" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="وصف الإيراد" value={incomeDraft.title} onChange={(event) => setIncomeDraft((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="المصدر" value={incomeDraft.source} onChange={(event) => setIncomeDraft((current) => ({ ...current, source: event.target.value }))} />
              <Input placeholder="المبلغ" type="number" min="0" value={incomeDraft.amount} onChange={(event) => setIncomeDraft((current) => ({ ...current, amount: event.target.value }))} />
              <Input type="date" value={incomeDraft.date} onChange={(event) => setIncomeDraft((current) => ({ ...current, date: event.target.value }))} />
            </div>
          ) : null}

          {dialogSection === "trips" ? (
            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="اسم الرحلة أو الفعالية" value={tripDraft.title} onChange={(event) => setTripDraft((current) => ({ ...current, title: event.target.value }))} />
              <Input type="date" value={tripDraft.date} onChange={(event) => setTripDraft((current) => ({ ...current, date: event.target.value }))} />
              <div className="space-y-3 rounded-2xl border border-[#dbe5f5] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-[#1f2937]">التكلفة</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTripDraft((current) => ({ ...current, costs: [...current.costs, ""] }))}
                    className="h-8 w-8 rounded-full border-[#3453a7] bg-white p-0 text-[#3453a7] hover:bg-[#f8fbff]"
                    aria-label="إضافة مبلغ جديد"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tripDraft.costs.map((cost, index) => (
                  <div key={`trip-cost-${index}`} className="flex items-center gap-2">
                    <Input
                      placeholder={`المبلغ ${index + 1}`}
                      type="number"
                      min="0"
                      value={cost}
                      onChange={(event) => setTripDraft((current) => ({
                        ...current,
                        costs: current.costs.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTripDraft((current) => ({
                        ...current,
                        costs: current.costs.length === 1 ? [""] : current.costs.filter((_, entryIndex) => entryIndex !== index),
                      }))}
                      className="h-10 w-10 shrink-0 rounded-full border-[#e5d5d5] p-0 text-[#b42318]"
                      aria-label="حذف مبلغ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={closeDialog}>إلغاء</Button>
            <Button type="button" onClick={() => { void handleAddRecord() }} className="bg-[#3453a7] text-white hover:bg-[#28448e]">إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
