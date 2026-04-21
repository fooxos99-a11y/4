"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  EnrollmentJuzReviewStatus,
  EnrollmentJuzTestStatus,
  formatEnrollmentMemorizedAmount,
  getNeedsMasteryJuzNumbers,
  getPassedJuzNumbers,
  getReviewRequestedJuzNumbers,
  normalizeSelectedJuzs,
  normalizeEnrollmentReviewResults,
  normalizeEnrollmentTestResults,
} from "@/lib/enrollment-test-utils"

interface EnrollmentRequestWithTests {
  id: string
  full_name: string
  educational_stage: string
  memorized_amount?: string | null
  selected_juzs?: number[]
  created_at: string
  test_reviewed?: boolean | null
  juz_test_results?: Record<number, EnrollmentJuzTestStatus>
  juz_review_results?: Record<number, EnrollmentJuzReviewStatus>
}

export function GlobalTestedEnrollmentReviewDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const requestedRequestId = searchParams?.get("requestId") || ""

  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [requests, setRequests] = useState<EnrollmentRequestWithTests[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState("")
  const [reviewResults, setReviewResults] = useState<Record<number, EnrollmentJuzReviewStatus>>({})

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from("enrollment_requests")
          .select("id, full_name, educational_stage, memorized_amount, selected_juzs, created_at, test_reviewed, juz_test_results, juz_review_results")
          .order("created_at", { ascending: false })

        if (error) throw error

        const normalizedRequests = (data || []).map((request: any) => ({
          ...request,
          selected_juzs: normalizeSelectedJuzs(request.selected_juzs),
          test_reviewed: Boolean(request.test_reviewed),
          juz_test_results: normalizeEnrollmentTestResults(request.juz_test_results),
          juz_review_results: normalizeEnrollmentReviewResults(request.juz_review_results),
        }))

        const eligibleRequests = normalizedRequests.filter((request) => request.test_reviewed && getReviewRequestedJuzNumbers(request.juz_test_results).length > 0)

        setRequests(eligibleRequests)
        setSelectedRequestId((current) => {
          if (requestedRequestId && eligibleRequests.some((request) => request.id === requestedRequestId)) {
            return requestedRequestId
          }

          if (current && eligibleRequests.some((request) => request.id === current)) {
            return current
          }

          return ""
        })
      } catch (error) {
        console.error(error)
        toast({ title: "خطأ", description: "تعذر جلب طلبات العرض", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    loadRequests()
  }, [requestedRequestId, supabase])

  useEffect(() => {
    if (requestedRequestId && requests.some((request) => request.id === requestedRequestId)) {
      setSelectedRequestId(requestedRequestId)
    }
  }, [requestedRequestId, requests])

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) || null,
    [requests, selectedRequestId],
  )
  const passedJuzs = useMemo(
    () => (selectedRequest ? getReviewRequestedJuzNumbers(selectedRequest.juz_test_results) : []),
    [selectedRequest],
  )

  useEffect(() => {
    if (!selectedRequest) {
      setReviewResults((current) => (Object.keys(current).length === 0 ? current : {}))
      return
    }

    const nextResults = passedJuzs.reduce<Record<number, EnrollmentJuzReviewStatus>>((accumulator, juzNumber) => {
      accumulator[juzNumber] = selectedRequest.juz_review_results?.[juzNumber] || "pass"
      return accumulator
    }, {})

    setReviewResults((current) => {
      const currentEntries = Object.entries(current)
      const nextEntries = Object.entries(nextResults)
      if (currentEntries.length === nextEntries.length && currentEntries.every(([key, value]) => nextResults[Number(key)] === value)) {
        return current
      }

      return nextResults
    })
  }, [passedJuzs, selectedRequest])

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => {
        router.push(window.location.pathname)
      }, 300)
    }
  }

  const handleSave = async () => {
    if (!selectedRequest) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("enrollment_requests")
        .update({ juz_review_results: reviewResults })
        .eq("id", selectedRequest.id)

      if (error) throw error

      setRequests((current) => current.map((request) => (
        request.id === selectedRequest.id
          ? { ...request, juz_review_results: reviewResults }
          : request
      )))

      toast({ title: "نجاح", description: "تم حفظ نتائج العرض" })
    } catch (error) {
      console.error(error)
      toast({ title: "خطأ", description: "تعذر حفظ نتائج العرض", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[92vw] md:max-w-[980px] w-full min-h-[65vh] max-h-[88vh] flex flex-col bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-5 py-4 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right shrink-0">
          <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
            <Eye className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
            <span>العرض</span>
          </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 pr-10 mt-1">
              الطلاب الذين يجب عليهم عرض حفظهم
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <SiteLoader size="md" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-lg font-semibold text-[#1a2332]">لا يوجد طلاب جاهزون للعرض</p>
            <p className="text-sm text-neutral-500">سيظهر هنا فقط من لديهم أجزاء تم تحويلها إلى العرض من نافذة قبول الطالب.</p>
          </div>
        ) : (
          <div className="grid flex-1 min-h-0 lg:grid-cols-[280px,1fr]">
            <div className="border-l border-[#3453a7]/20 overflow-y-auto p-4 space-y-3 bg-[#fcfbf9]">
              <div className="rounded-2xl border border-[#3453a7]/20 bg-white px-4 py-3 text-right">
                <p className="text-sm font-bold text-[#1a2332]">اختر الطالب</p>
                <p className="mt-1 text-xs text-neutral-500">سيظهر هنا فقط الطلاب الذين لديهم أجزاء تم تحويلها إلى العرض.</p>
              </div>

              {requests.map((request) => {
                const passedCount = getPassedJuzNumbers(request.juz_test_results, request.juz_review_results).length
                const masteryCount = getNeedsMasteryJuzNumbers(request.juz_test_results, request.juz_review_results).length
                const reviewCount = getReviewRequestedJuzNumbers(request.juz_test_results).length

                return (
                  <button
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-2xl border p-4 text-right transition-colors ${selectedRequestId === request.id ? "border-[#3453a7] bg-white shadow-sm" : "border-[#3453a7]/20 bg-white hover:border-[#3453a7]/45"}`}
                  >
                    <p className="font-bold text-[#1a2332]">{request.full_name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{request.educational_stage}</p>
                    <p className="mt-2 text-xs text-neutral-600">{formatEnrollmentMemorizedAmount(request.memorized_amount || undefined, request.selected_juzs)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        ناجح: {passedCount}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        عرض: {reviewCount}
                      </span>
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                        إتقان: {masteryCount}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="min-h-0 overflow-y-auto p-5 space-y-4">
              {selectedRequest ? (
                <>
                  <div className="rounded-2xl border border-[#3453a7]/25 bg-white p-4">
                    <h3 className="text-lg font-bold text-[#1a2332]">{selectedRequest.full_name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{selectedRequest.educational_stage}</p>
                    <p className="mt-3 text-sm text-neutral-700">المحفوظ المصرح به: {formatEnrollmentMemorizedAmount(selectedRequest.memorized_amount || undefined, selectedRequest.selected_juzs)}</p>
                  </div>

                  <div className="rounded-2xl border border-[#3453a7]/25 bg-white p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-[#1a2332]">تقييم الأجزاء المحوّلة إلى العرض</h4>
                      <p className="mt-1 text-xs text-neutral-500">هذه الأجزاء تم اختيار "عرض" لها من نافذة قبول الطالب.</p>
                    </div>

                    {passedJuzs.map((juzNumber) => (
                      <div key={juzNumber} className="flex items-center justify-between gap-3 rounded-xl border border-[#3453a7]/20 px-3 py-3">
                        <div>
                          <p className="font-semibold text-[#1a2332]">الجزء {juzNumber}</p>
                        </div>
                        <Select
                          value={reviewResults[juzNumber] || "pass"}
                          onValueChange={(value: EnrollmentJuzReviewStatus) => setReviewResults((current) => ({ ...current, [juzNumber]: value }))}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="اختر النتيجة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pass">ناجح</SelectItem>
                            <SelectItem value="fail">راسب</SelectItem>
                            <SelectItem value="needs_mastery">اتقان</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#3453a7]/20 bg-[#fcfbf9] px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        محفوظ: {getPassedJuzNumbers(selectedRequest.juz_test_results, reviewResults).length}
                      </span>
                      <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                        غير محفوظ: {passedJuzs.filter((juzNumber) => reviewResults[juzNumber] === "fail").length}
                      </span>
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                        يحتاج إلى إتقان: {getNeedsMasteryJuzNumbers(selectedRequest.juz_test_results, reviewResults).length}
                      </span>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#3453a7] hover:bg-[#c39a2e] text-white">
                      <Save className="w-4 h-4 ml-2" />
                      {isSaving ? "جارٍ الحفظ..." : "حفظ العرض"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-full items-center justify-center rounded-2xl border border-dashed border-[#3453a7]/30 bg-[#fcfbf9] px-6 py-10 text-center">
                  <div>
                    <p className="text-lg font-bold text-[#1a2332]">اختر الطالب</p>
                    <p className="mt-2 text-sm text-neutral-500">اختر أحد الطلاب الذين لديهم عرض، ثم ستظهر لك الأجزاء المحوّلة لتقييمها إلى ناجح أو راسب أو اتقان.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}