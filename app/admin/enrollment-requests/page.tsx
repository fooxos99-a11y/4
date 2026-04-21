"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { Copy, Check, ExternalLink, Lock, Unlock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { getContiguousCompletedJuzRange, getJuzBoundsRange } from "@/lib/quran-data";
import {
  EnrollmentJuzReviewStatus,
  EnrollmentJuzTestStatus,
  filterReviewResultsByReviewRequestedJuzs,
  getContiguousSelectedJuzRange,
  getJuzNumbersFromAmount,
  formatEnrollmentMemorizedAmount,
  getNeedsMasteryJuzNumbers,
  getPassedJuzNumbers,
  parseEnrollmentPartialJuzRanges,
  getReviewRequestedJuzNumbers,
  getTestableJuzNumbers,
  isContiguousJuzSelection,
  normalizeEnrollmentReviewResults,
  normalizeSelectedJuzs,
  normalizeEnrollmentTestResults,
} from "@/lib/enrollment-test-utils"

const TEST_RESULTS_STORAGE_PREFIX = "enrollment-test-results:";
const ACCEPT_WHATSAPP_MESSAGE_STORAGE_KEY = "enrollment-accept-whatsapp-message";
const REJECT_WHATSAPP_MESSAGE_STORAGE_KEY = "enrollment-reject-whatsapp-message";
const DEFAULT_ACCEPT_WHATSAPP_MESSAGE = "نفيدكم بقبول ابنكم في المجمع";
const DEFAULT_REJECT_WHATSAPP_MESSAGE = "نفيدكم برفض ابنكم في المجمع";

function getTestResultsStorageKey(requestId: string) {
  return `${TEST_RESULTS_STORAGE_PREFIX}${requestId}`;
}

function loadSavedTestResults(requestId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getTestResultsStorageKey(requestId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      hasReviewedTest?: boolean;
      juzTestResults?: Record<number, EnrollmentJuzTestStatus>;
      juzReviewResults?: Record<number, EnrollmentJuzReviewStatus>;
    };

    return {
      hasReviewedTest: Boolean(parsed?.hasReviewedTest),
      juzTestResults: normalizeEnrollmentTestResults(parsed?.juzTestResults),
      juzReviewResults: normalizeEnrollmentReviewResults(parsed?.juzReviewResults),
    };
  } catch {
    return null;
  }
}

function saveTestResults(
  requestId: string,
  juzTestResults: Record<number, EnrollmentJuzTestStatus>,
  juzReviewResults: Record<number, EnrollmentJuzReviewStatus>,
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getTestResultsStorageKey(requestId),
    JSON.stringify({ hasReviewedTest: true, juzTestResults, juzReviewResults }),
  );
}

function clearSavedTestResults(requestId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(getTestResultsStorageKey(requestId));
}

function loadEnrollmentWhatsAppMessage(storageKey: string, fallbackMessage: string) {
  if (typeof window === "undefined") return fallbackMessage;

  const storedMessage = window.localStorage.getItem(storageKey)?.trim();
  return storedMessage || fallbackMessage;
}

function saveEnrollmentWhatsAppMessage(storageKey: string, message: string) {
  if (typeof window === "undefined") return;

  const trimmedMessage = message.trim();
  if (!trimmedMessage) return;

  window.localStorage.setItem(storageKey, trimmedMessage);
}

function buildDefaultTestResults(juzNumbers: number[], currentResults?: Record<number, EnrollmentJuzTestStatus>) {
  return juzNumbers.reduce<Record<number, EnrollmentJuzTestStatus>>((accumulator, juzNumber) => {
    accumulator[juzNumber] = currentResults?.[juzNumber] || "pass"
    return accumulator
  }, {})
}

function formatMemorizedDisplay(amount?: string | null, selectedJuzs?: number[] | null) {
  return formatEnrollmentMemorizedAmount(amount, selectedJuzs)
}

function getReadableErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف";

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    return error.message || "حدث خطأ غير معروف";
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string;
      error?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return candidate.message || candidate.error || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate);
  }

  return String(error);
}

async function getResponsePayload(response: Response) {
  const rawText = await response.text();

  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function hasPendingEnrollmentReview(
  testResults?: Record<number, EnrollmentJuzTestStatus>,
  reviewResults?: Record<number, EnrollmentJuzReviewStatus>,
) {
  const reviewRequestedJuzs = getReviewRequestedJuzNumbers(testResults);
  if (reviewRequestedJuzs.length === 0) return false;

  return reviewRequestedJuzs.some((juzNumber) => !reviewResults?.[juzNumber]);
}

interface EnrollmentRequest {
  id: string;
  full_name: string;
  guardian_phone: string;
  id_number: string;
  educational_stage: string;
  memorized_amount?: string;
  selected_juzs?: number[];
  created_at: string;
  test_reviewed?: boolean | null;
  juz_test_results?: Record<number, EnrollmentJuzTestStatus>;
  juz_review_results?: Record<number, EnrollmentJuzReviewStatus>;
}

export default function EnrollmentRequestsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("طلبات التسجيل");

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [circles, setCircles] = useState<any[]>([]);
  const [acceptRequest, setAcceptRequest] = useState<EnrollmentRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<EnrollmentRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [hasReviewedTest, setHasReviewedTest] = useState(false);
  const [juzTestResults, setJuzTestResults] = useState<Record<number, EnrollmentJuzTestStatus>>({});
  const [juzReviewResults, setJuzReviewResults] = useState<Record<number, EnrollmentJuzReviewStatus>>({});
  const [draftJuzReviewResults, setDraftJuzReviewResults] = useState<Record<number, EnrollmentJuzReviewStatus>>({});
  const [isReviewInfoOpen, setIsReviewInfoOpen] = useState(false);
  const [acceptWhatsAppMessage, setAcceptWhatsAppMessage] = useState(DEFAULT_ACCEPT_WHATSAPP_MESSAGE);
  const [rejectWhatsAppMessage, setRejectWhatsAppMessage] = useState(DEFAULT_REJECT_WHATSAPP_MESSAGE);
  const [acceptForm, setAcceptForm] = useState({
    name: "",
    phone: "",
    id_number: "",
    account_number: "",
    educational_stage: "",
    memorized_amount: "",
    selected_juzs: [] as number[],
    circle_id: "",
  });

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const response = await fetch("/api/circles", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && Array.isArray(data.circles)) {
          setCircles(data.circles);
        }
      } catch (error) {
        console.error("[enrollment-requests] fetch circles:", error);
      }
    };
    void fetchCircles();
  }, []);

  const persistRequestTestResults = async (
    requestId: string,
    nextJuzTestResults: Record<number, EnrollmentJuzTestStatus>,
    nextJuzReviewResults: Record<number, EnrollmentJuzReviewStatus>,
  ) => {
    const response = await fetch("/api/enrollment-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-test-results",
        requestId,
        juzTestResults: nextJuzTestResults,
        juzReviewResults: nextJuzReviewResults,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(getReadableErrorMessage(payload?.error || payload));
    }

    setRequests((current) => current.map((request) => (
      request.id === requestId
        ? {
            ...request,
            test_reviewed: true,
            juz_test_results: nextJuzTestResults,
            juz_review_results: nextJuzReviewResults,
          }
        : request
    )));
  };

  const handleOpenAccept = (req: EnrollmentRequest) => {
    const initialJuzResults = buildDefaultTestResults(
      getTestableJuzNumbers(req.selected_juzs, req.memorized_amount),
    )
    const savedTestResults = loadSavedTestResults(req.id);
    const persistedTestResults = Object.keys(req.juz_test_results || {}).length > 0
      ? buildDefaultTestResults(getTestableJuzNumbers(req.selected_juzs, req.memorized_amount), req.juz_test_results || {})
      : buildDefaultTestResults(
          getTestableJuzNumbers(req.selected_juzs, req.memorized_amount),
          savedTestResults?.juzTestResults || initialJuzResults,
        );
    const persistedReviewResults = Object.keys(req.juz_review_results || {}).length > 0
      ? filterReviewResultsByReviewRequestedJuzs(persistedTestResults, req.juz_review_results)
      : filterReviewResultsByReviewRequestedJuzs(persistedTestResults, savedTestResults?.juzReviewResults);

    setAcceptRequest(req);
    setAcceptWhatsAppMessage(loadEnrollmentWhatsAppMessage(ACCEPT_WHATSAPP_MESSAGE_STORAGE_KEY, DEFAULT_ACCEPT_WHATSAPP_MESSAGE));
    setAcceptForm({
      name: req.full_name,
      phone: req.guardian_phone,
      id_number: req.id_number,
      account_number: req.id_number,
      educational_stage: req.educational_stage,
      memorized_amount: req.memorized_amount || "",
      selected_juzs: normalizeSelectedJuzs(req.selected_juzs),
      circle_id: "",
    });
    setJuzTestResults(persistedTestResults);
    setJuzReviewResults(persistedReviewResults);
    setDraftJuzReviewResults(persistedReviewResults);
    setHasReviewedTest(Boolean(req.test_reviewed) || savedTestResults?.hasReviewedTest || false);
    setIsTestDialogOpen(false);
    setIsReviewDialogOpen(false);
  };

  const handleOpenReject = (req: EnrollmentRequest) => {
    setRejectRequest(req);
    setRejectWhatsAppMessage(loadEnrollmentWhatsAppMessage(REJECT_WHATSAPP_MESSAGE_STORAGE_KEY, DEFAULT_REJECT_WHATSAPP_MESSAGE));
  };

  const sendGuardianWhatsAppMessage = async (phoneNumber: string, message: string) => {
    const response = await fetch("/api/enrollment-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, message }),
    });

    const result = await getResponsePayload(response);
    if (!response.ok) {
      throw new Error(
        typeof result === "object" && result !== null && "error" in result
          ? getReadableErrorMessage((result as { error?: unknown }).error)
          : getReadableErrorMessage(result),
      );
    }

    const queued = typeof result === "object" && result !== null && "queued" in result
      ? Boolean((result as { queued?: unknown }).queued)
      : false;

    return { queued };
  };

  const handleConfirmAccept = async () => {
    if (!acceptRequest) return;
    if (!acceptForm.circle_id) {
      toast({ title: "خطأ", description: "الرجاء اختيار الحلقة", variant: "destructive" });
      return;
    }
    if (!acceptWhatsAppMessage.trim()) {
      toast({ title: "خطأ", description: "اكتب نص الرسالة أولاً", variant: "destructive" });
      return;
    }

    const selectedCircle = circles.find((circle) => String(circle.id) === String(acceptForm.circle_id));
    if (!selectedCircle?.name) {
      toast({ title: "خطأ", description: "تعذر تحديد اسم الحلقة", variant: "destructive" });
      return;
    }
    
    const normalizedSelectedJuzs = normalizeSelectedJuzs(acceptForm.selected_juzs);
    const partialMemorizedRanges = parseEnrollmentPartialJuzRanges(acceptForm.memorized_amount).map((range) => ({
      startSurahNumber: range.fromSurahNumber,
      startVerseNumber: range.fromVerseNumber,
      endSurahNumber: range.toSurahNumber,
      endVerseNumber: range.toVerseNumber,
    }));
    const partialJuzNumbers = new Set(parseEnrollmentPartialJuzRanges(acceptForm.memorized_amount).map((range) => range.juzNumber));
    const contiguousSelectedRange = getContiguousSelectedJuzRange(normalizedSelectedJuzs);
    const parsedAmountRange = getJuzNumbersFromAmount(acceptForm.memorized_amount);
    const fullyMemorizedSelectedJuzs = normalizedSelectedJuzs.filter((juzNumber) => !partialJuzNumbers.has(juzNumber));

    if (!hasReviewedTest && normalizedSelectedJuzs.length > 0 && !isContiguousJuzSelection(normalizedSelectedJuzs)) {
      toast({ title: "خطأ", description: "المحفوظ المتفرق يحتاج إلى اختبار أو عرض قبل قبول الطالب", variant: "destructive" });
      return;
    }

    const defaultRangeBounds = fullyMemorizedSelectedJuzs.length > 0 && isContiguousJuzSelection(fullyMemorizedSelectedJuzs)
      ? getJuzBoundsRange(fullyMemorizedSelectedJuzs[0], fullyMemorizedSelectedJuzs[fullyMemorizedSelectedJuzs.length - 1])
      : parsedAmountRange.length > 0
        ? getJuzBoundsRange(parsedAmountRange[0], parsedAmountRange[parsedAmountRange.length - 1])
        : partialMemorizedRanges.length > 0
          ? {
              startSurahNumber: partialMemorizedRanges[0].startSurahNumber,
              startVerseNumber: partialMemorizedRanges[0].startVerseNumber,
              endSurahNumber: partialMemorizedRanges[partialMemorizedRanges.length - 1].endSurahNumber,
              endVerseNumber: partialMemorizedRanges[partialMemorizedRanges.length - 1].endVerseNumber,
            }
          : contiguousSelectedRange
            ? getJuzBoundsRange(contiguousSelectedRange.fromJuz, contiguousSelectedRange.toJuz)
            : null;
    const declaredPassedJuzs = normalizedSelectedJuzs.length > 0 ? fullyMemorizedSelectedJuzs : parsedAmountRange;
    const passedJuzs = (hasReviewedTest
      ? getPassedJuzNumbers(juzTestResults, juzReviewResults)
      : declaredPassedJuzs).filter((juzNumber) => !partialJuzNumbers.has(juzNumber));
    const masteryJuzs = hasReviewedTest ? getNeedsMasteryJuzNumbers(juzTestResults, juzReviewResults) : [];
    const derivedCompletedRange = isContiguousJuzSelection(passedJuzs)
      ? getContiguousCompletedJuzRange(passedJuzs)
      : null;

    if (reviewRequestedJuzCount > 0 && isReviewPending) {
      toast({ title: "خطأ", description: "يجب إكمال العرض وتحديد نتيجة كل جزء قبل تأكيد القبول", variant: "destructive" });
      return;
    }

    setIsAccepting(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: acceptForm.name,
          circle_name: selectedCircle.name,
          id_number: acceptForm.id_number,
          guardian_phone: acceptForm.phone,
          account_number: Number.parseInt(acceptForm.account_number, 10),
          initial_points: 0,
          memorized_start_surah: derivedCompletedRange?.startSurahNumber ?? defaultRangeBounds?.startSurahNumber ?? null,
          memorized_start_verse: derivedCompletedRange?.startVerseNumber ?? defaultRangeBounds?.startVerseNumber ?? null,
          memorized_end_surah: derivedCompletedRange?.endSurahNumber ?? defaultRangeBounds?.endSurahNumber ?? null,
          memorized_end_verse: derivedCompletedRange?.endVerseNumber ?? defaultRangeBounds?.endVerseNumber ?? null,
          memorized_ranges: partialMemorizedRanges.length > 0 ? partialMemorizedRanges : undefined,
          completed_juzs: passedJuzs.length > 0 ? passedJuzs : undefined,
          current_juzs: masteryJuzs.length > 0 ? masteryJuzs : undefined,
        }),
      });

      const result = await getResponsePayload(response);

      if (!response.ok) {
        const errorMessage = typeof result === "object" && result !== null && "error" in result
          ? getReadableErrorMessage((result as { error?: unknown }).error)
          : getReadableErrorMessage(result);
        console.error("Enrollment accept insert error:", errorMessage, result);
        toast({ title: "خطأ", description: errorMessage || "تعذر قبول الطالب", variant: "destructive" });
        return;
      }

      const deleteResponse = await fetch(`/api/enrollment-requests?id=${encodeURIComponent(acceptRequest.id)}`, {
        method: "DELETE",
      });
      const deletePayload = await deleteResponse.json();
      if (!deleteResponse.ok) {
        console.error("Enrollment request delete error:", deletePayload);
        toast({ title: "تنبيه", description: "تم إنشاء الطالب ولكن تعذر حذف الطلب من القائمة", variant: "destructive" });
        return;
      }

      setRequests(requests.filter(r => r.id !== acceptRequest.id));
      clearSavedTestResults(acceptRequest.id);
      let acceptMessageQueued = false;
      try {
        const notificationResult = await sendGuardianWhatsAppMessage(acceptForm.phone, acceptWhatsAppMessage);
        acceptMessageQueued = notificationResult.queued;
        saveEnrollmentWhatsAppMessage(ACCEPT_WHATSAPP_MESSAGE_STORAGE_KEY, acceptWhatsAppMessage);
      } catch (notificationError) {
        console.error("Enrollment accept WhatsApp error:", notificationError);
      }

      setAcceptRequest(null);
      setIsTestDialogOpen(false);
      toast({
        title: "نجاح",
        description: hasReviewedTest
          ? `تم قبول الطالب وحفظ ${passedJuzs.length} جزء ناجح${masteryJuzs.length > 0 ? `، و${masteryJuzs.length} جزء يحتاج إلى إتقان` : ""}`
          : passedJuzs.length > 0
            ? `تم قبول الطالب وحفظ ${passedJuzs.length} جزء`
            : "تم قبول الطالب بنجاح",
      });

      if (!acceptMessageQueued) {
        toast({ title: "تنبيه", description: "تم قبول الطالب لكن لم يتم تأكيد إرسال رسالة واتساب لولي الأمر", variant: "destructive" });
      }
    } finally {
      setIsAccepting(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchEnrollmentStatus();
  }, []);

  const fetchEnrollmentStatus = async () => {
    try {
      const response = await fetch("/api/enrollment-requests", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && typeof payload.isEnrollmentOpen === "boolean") {
        setIsEnrollmentOpen(payload.isEnrollmentOpen);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleEnrollmentStatus = async () => {
    setIsStatusLoading(true);
    const newStatus = !isEnrollmentOpen;
    try {
      const response = await fetch("/api/enrollment-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status", isActive: newStatus }),
      });
      const payload = await response.json();

      if (response.ok && payload?.success) {
        setIsEnrollmentOpen(newStatus);
        toast({ title: newStatus ? "تم فتح استقبال طلبات التسجيل" : "تم إغلاق طلبات التسجيل" });
      } else {
        toast({ title: "حدث خطأ أثناء تغيير الحالة", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/enrollment-requests", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) throw new Error(getReadableErrorMessage(payload?.error || payload));

      if (typeof payload.isEnrollmentOpen === "boolean") {
        setIsEnrollmentOpen(payload.isEnrollmentOpen);
      }

      setRequests(((payload.requests || []) as any[]).map((request: any) => ({
        ...request,
        selected_juzs: normalizeSelectedJuzs(request.selected_juzs),
        test_reviewed: Boolean(request.test_reviewed),
        juz_test_results: normalizeEnrollmentTestResults(request.juz_test_results),
        juz_review_results: normalizeEnrollmentReviewResults(request.juz_review_results),
      })));
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({ title: "حدث خطأ أثناء جلب طلبات التسجيل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/enrollment-requests?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getReadableErrorMessage(payload?.error || payload));
      
      clearSavedTestResults(id);
      setRequests(requests.filter(req => req.id !== id));
      toast({ title: "تم حذف الطلب بنجاح" });
    } catch (error: any) {
      console.error("Error deleting request:", error);
      toast({ title: "حدث خطأ أثناء حذف الطلب", variant: "destructive" });
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectRequest) return;
    if (!rejectWhatsAppMessage.trim()) {
      toast({ title: "خطأ", description: "اكتب نص الرسالة أولاً", variant: "destructive" });
      return;
    }

    setIsRejecting(true);
    try {
      let rejectMessageQueued = false;
      try {
        const notificationResult = await sendGuardianWhatsAppMessage(rejectRequest.guardian_phone, rejectWhatsAppMessage);
        rejectMessageQueued = notificationResult.queued;
        saveEnrollmentWhatsAppMessage(REJECT_WHATSAPP_MESSAGE_STORAGE_KEY, rejectWhatsAppMessage);
      } catch (notificationError) {
        console.error("Enrollment reject WhatsApp error:", notificationError);
      }

      const response = await fetch(`/api/enrollment-requests?id=${encodeURIComponent(rejectRequest.id)}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(getReadableErrorMessage(payload?.error || payload));

      clearSavedTestResults(rejectRequest.id);
      setRequests(requests.filter(req => req.id !== rejectRequest.id));
      setRejectRequest(null);

      toast({ title: "تم رفض الطلب بنجاح" });

      if (!rejectMessageQueued) {
        toast({ title: "تنبيه", description: "تم رفض الطلب لكن لم يتم تأكيد إرسال رسالة واتساب لولي الأمر", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({ title: "حدث خطأ أثناء رفض الطلب", variant: "destructive" });
    } finally {
      setIsRejecting(false);
    }
  };

  const copyEnrollmentLink = () => {
    const link = `${window.location.origin}/enroll`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast({ title: "تم نسخ الرابط بنجاح" });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const testableJuzs = useMemo(
    () => getTestableJuzNumbers(acceptForm.selected_juzs, acceptForm.memorized_amount),
    [acceptForm.memorized_amount, acceptForm.selected_juzs],
  );
  const reviewRequestedJuzs = useMemo(
    () => getReviewRequestedJuzNumbers(juzTestResults),
    [juzTestResults],
  );
  const passedJuzCount = getPassedJuzNumbers(juzTestResults, juzReviewResults).length;
  const masteryJuzCount = getNeedsMasteryJuzNumbers(juzTestResults, juzReviewResults).length;
  const reviewRequestedJuzCount = reviewRequestedJuzs.length;
  const isReviewPending = hasPendingEnrollmentReview(juzTestResults, juzReviewResults);
  const requiresReviewedTest = testableJuzs.length > 0;
  const isAcceptReady = Boolean(acceptForm.circle_id) && !isReviewPending && (!requiresReviewedTest || hasReviewedTest);

	if (authLoading || !authVerified) return <SiteLoader fullScreen />;

	return (
		<div className="min-h-screen flex flex-col bg-[#f6f7f9] font-cairo" dir="rtl">
			<Header />

			<main className="flex-grow">
				<div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
					<section className="rounded-[28px] border border-[#3453a7]/15 bg-white px-5 py-6 shadow-sm md:px-8">
						<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
							<div className="space-y-3">
								<div className="space-y-2">
									<h1 className="text-3xl font-bold text-[#1a2332]">طلبات التسجيل</h1>
									<p className="max-w-2xl text-sm leading-7 text-neutral-500 md:text-base">
										متابعة الطلبات الواردة، تنفيذ الاختبار والعرض، ثم اعتماد الطالب مباشرة داخل الحلقة المناسبة.
									</p>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-3 lg:justify-end">
								<button
									onClick={toggleEnrollmentStatus}
									disabled={isStatusLoading}
									className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
										isEnrollmentOpen
											? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
											: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
									}`}
									title={isEnrollmentOpen ? "إيقاف استقبال طلبات التسجيل" : "تفعيل استقبال طلبات التسجيل"}
								>
									{isStatusLoading ? (
										<Loader2 className="h-5 w-5 animate-spin" />
									) : isEnrollmentOpen ? (
										<Lock className="h-5 w-5" />
									) : (
										<Unlock className="h-5 w-5" />
									)}
									<span>{isEnrollmentOpen ? "إقفال التسجيل" : "فتح التسجيل"}</span>
								</button>

								<button
									onClick={copyEnrollmentLink}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#3453a7] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#24428f] focus-visible:bg-[#24428f]"
								>
									{copiedLink ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
									<span>نسخ الرابط</span>
								</button>

								<Link
									href="/enroll"
									target="_blank"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#3453a7]/40 bg-white px-4 py-3 text-sm font-semibold text-[#3453a7] transition-all hover:bg-[#3453a7]/5"
									title="معاينة نموذج التسجيل"
								>
									<ExternalLink className="h-5 w-5" />
								</Link>
							</div>
						</div>
					</section>

					<section className="overflow-hidden rounded-[28px] border border-[#3453a7]/15 bg-white shadow-sm">
						<div className="flex items-center justify-between border-b border-[#3453a7]/10 px-5 py-4 md:px-6">
							<div>
								<h2 className="text-lg font-bold text-[#1a2332]">قائمة الطلبات</h2>
								<p className="text-sm text-neutral-500">كل طلب يحتوي على بيانات الطالب وخيارات القبول أو الرفض.</p>
							</div>
						</div>

						{loading ? (
							<div className="flex min-h-[320px] items-center justify-center">
								<SiteLoader />
							</div>
						) : requests.length === 0 ? (
							<div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
								<p className="text-xl font-semibold text-neutral-400">لا توجد طلبات تسجيل حتى الآن</p>
								<p className="mt-2 text-sm text-neutral-500">عند وصول طلبات جديدة ستظهر هنا تلقائيًا.</p>
							</div>
						) : (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <table className="w-full min-w-[760px] text-right">
                  <thead className="bg-white text-[#20335f]">
										<tr>
											<th className="px-6 py-4 font-semibold">الاسم الثلاثي</th>
											<th className="px-6 py-4 font-semibold">رقم ولي الأمر</th>
											<th className="px-6 py-4 font-semibold">رقم الهوية</th>
											<th className="px-6 py-4 font-semibold">المرحلة الدراسية</th>
											<th className="px-6 py-4 font-semibold">المحفوظ</th>
											<th className="px-6 py-4 font-semibold">تاريخ الطلب</th>
											<th className="px-6 py-4 font-semibold">الإجراءات</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[#3453a7]/10">
										{requests.map((request) => (
											<tr key={request.id} className="transition-colors hover:bg-[#3453a7]/5">
												<td className="px-6 py-4 align-top font-medium text-gray-900">
													<div className="flex min-w-[180px] flex-col gap-2">
														<span className="font-semibold text-[#1a2332]">{request.full_name}</span>
														{Boolean(request.test_reviewed) && hasPendingEnrollmentReview(request.juz_test_results, request.juz_review_results) && (
															<span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
																في انتظار العرض
															</span>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dir-ltr">
													{request.guardian_phone}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dir-ltr">
													{request.id_number}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-gray-600">
													{request.educational_stage}
												</td>
												<td className="px-6 py-4 text-gray-600">
                          {formatMemorizedDisplay(request.memorized_amount, request.selected_juzs)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{new Date(request.created_at).toLocaleString("ar-SA", {
														year: "numeric",
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center justify-center gap-2">
														<button
															onClick={() => handleOpenAccept(request)}
															className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
															title="قبول"
														>
															قبول
														</button>
														<button
                              onClick={() => handleOpenReject(request)}
															className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
															title="رفض"
														>
															رفض
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</div>
			</main>

      <Dialog open={!!acceptRequest} onOpenChange={(open) => {
				if (!open) {
					setAcceptRequest(null)
					setIsReviewDialogOpen(false)
					setIsTestDialogOpen(false)
					setDraftJuzReviewResults({})
				}
			}}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden border-[#3453a7]/20 bg-white p-0 [&>button]:hidden" dir="rtl">
  				<DialogHeader className="border-b border-[#3453a7]/10 bg-white px-6 py-5 text-right">
						<DialogTitle className="text-xl text-[#1a2332]">قبول الطالب</DialogTitle>
					</DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label>الاسم</Label>
								<Input value={acceptForm.name} onChange={(e) => setAcceptForm({ ...acceptForm, name: e.target.value })} />
							</div>
							<div className="grid gap-2">
								<Label>رقم الجوال</Label>
								<Input value={acceptForm.phone} onChange={(e) => setAcceptForm({ ...acceptForm, phone: e.target.value })} />
							</div>
							<div className="grid gap-2">
								<Label>رقم الهوية</Label>
								<Input value={acceptForm.id_number} onChange={(e) => setAcceptForm({ ...acceptForm, id_number: e.target.value })} />
							</div>
							<div className="grid gap-2">
								<Label>رقم الحساب</Label>
								<Input value={acceptForm.account_number} onChange={(e) => setAcceptForm({ ...acceptForm, account_number: e.target.value })} />
							</div>
							<div className="grid gap-2 md:col-span-2">
								<Label>المرحلة الدراسية</Label>
								<Input value={acceptForm.educational_stage} onChange={(e) => setAcceptForm({ ...acceptForm, educational_stage: e.target.value })} />
							</div>
						</div>

            <div className="space-y-3">
              <div className="grid gap-2 text-right">
                <Label>المحفوظ</Label>
                  <div className="flex min-h-11 items-center rounded-xl border border-input bg-white px-3 text-sm text-gray-600 shadow-sm">
                    {formatMemorizedDisplay(acceptForm.memorized_amount, acceptForm.selected_juzs) || "غير محدد"}
                  </div>
              </div>
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 border-[#3453a7]/30"
                  disabled={testableJuzs.length === 0}
                  onClick={() => setIsTestDialogOpen(true)}
                >
                  اختبار المحفوظ
                </Button>
              </div>

							{hasReviewedTest && testableJuzs.length > 0 && (
								<div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
									<p className="text-sm font-semibold text-emerald-700">
										تم اعتماد نتائج الاختبار: {passedJuzCount} من {testableJuzs.length} أجزاء ناجحة
									</p>

									{reviewRequestedJuzCount > 0 && (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm font-medium text-amber-800">
												هناك {reviewRequestedJuzCount} جزء تم تحويله إلى العرض.
											</p>
											<Button
												type="button"
												variant="outline"
                        className="h-9 border-amber-300 px-3 text-sm text-amber-800 hover:bg-amber-50"
												onClick={() => {
													setDraftJuzReviewResults(filterReviewResultsByReviewRequestedJuzs(juzTestResults, juzReviewResults))
													setIsReviewDialogOpen(true)
												}}
											>
                        العرض
											</Button>
										</div>
									)}
								</div>
							)}
						</div>

						<div className="grid gap-2">
							<Label>تحديد الحلقة</Label>
							<Select value={acceptForm.circle_id} onValueChange={(val) => setAcceptForm({ ...acceptForm, circle_id: val })}>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="اختر الحلقة" />
								</SelectTrigger>
								<SelectContent>
									{circles.map((c) => (
										<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

            <div className="grid gap-2">
              <Label>رسالة ولي الأمر عبر الواتساب</Label>
              <textarea
                value={acceptWhatsAppMessage}
                onChange={(e) => setAcceptWhatsAppMessage(e.target.value)}
                className="min-h-[120px] rounded-xl border border-input bg-white px-3 py-3 text-sm shadow-sm outline-none"
              />
            </div>

            {requiresReviewedTest && !hasReviewedTest && (
              <p className="text-sm font-medium text-amber-700">
                يجب حفظ نتائج الاختبار أولاً قبل تفعيل تأكيد القبول.
              </p>
            )}
					</div>

          <DialogFooter className="gap-2 border-t border-[#3453a7]/10 bg-white px-6 py-4 sm:space-x-0">
						<Button variant="outline" onClick={() => setAcceptRequest(null)}>إلغاء</Button>
						<Button
              disabled={isAccepting || !isAcceptReady}
							onClick={handleConfirmAccept}
              className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600 disabled:text-white disabled:opacity-35 disabled:pointer-events-none"
						>
							{isAccepting ? "جارٍ الحفظ..." : "تأكيد القبول"}
						</Button>
          </DialogFooter>
				</DialogContent>
			</Dialog>

      <Dialog open={!!rejectRequest} onOpenChange={(open) => {
        if (!open) {
          setRejectRequest(null)
        }
      }}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden border-[#3453a7]/20 bg-white p-0 [&>button]:hidden" dir="rtl">
        <DialogHeader className="border-b border-[#3453a7]/10 bg-white px-6 py-5 text-right">
          <DialogTitle className="text-xl text-[#1a2332]">رفض الطالب</DialogTitle>
          <DialogDescription className="pt-1 text-sm text-[#64748b]">
            سيتم إرسال النص التالي إلى ولي الأمر ثم إزالة الطلب من القائمة.
          </DialogDescription>
        </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-2xl border border-[#3453a7]/10 bg-[#f8fbff] px-4 py-3 text-sm text-[#20335f]">
            {rejectRequest?.full_name}
          </div>
          <div className="grid gap-2">
            <Label>سبب الرفض / نص الرسالة</Label>
            <textarea
              value={rejectWhatsAppMessage}
              onChange={(e) => setRejectWhatsAppMessage(e.target.value)}
              className="min-h-[140px] rounded-xl border border-input bg-white px-3 py-3 text-sm shadow-sm outline-none"
            />
          </div>
        </div>

          <DialogFooter className="gap-2 border-t border-[#3453a7]/10 bg-white px-6 py-4 sm:space-x-0">
          <Button variant="outline" onClick={() => setRejectRequest(null)}>إلغاء</Button>
          <Button
              disabled={isRejecting}
            onClick={handleConfirmReject}
              className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600 disabled:text-white disabled:opacity-35 disabled:pointer-events-none"
          >
            {isRejecting ? "جارٍ الرفض..." : "تأكيد الرفض"}
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden border-[#3453a7]/20 bg-white p-0 [&>button]:hidden" dir="rtl">
  				<DialogHeader className="border-b border-[#3453a7]/10 bg-white px-6 py-5 text-right">
						<DialogTitle className="text-xl text-[#1a2332]">اختبار المحفوظ</DialogTitle>
						<DialogDescription className="leading-7 text-neutral-600">
							حدِّد نتيجة كل جزء داخل المدى المختار، وسيتم حفظ الأجزاء الناجحة في ملف الطالب.
						</DialogDescription>
					</DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {testableJuzs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                لا يوجد مدى محفوظ قابل للاختبار.
              </div>
            ) : (
              testableJuzs.map((juzNumber) => (
                <div key={juzNumber} className="flex items-center justify-between gap-3 rounded-xl border border-[#3453a7]/20 px-3 py-3">
                  <div>
                    <p className="font-semibold text-[#1a2332]">الجزء {juzNumber}</p>
                  </div>
                  <Select
                    value={juzTestResults[juzNumber] || "pass"}
                    onValueChange={(value: EnrollmentJuzTestStatus) => setJuzTestResults((prev) => ({ ...prev, [juzNumber]: value }))}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="اختر النتيجة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">ناجح</SelectItem>
                      <SelectItem value="fail">راسب</SelectItem>
                      <SelectItem value="review">عرض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>

					<DialogFooter className="gap-2 border-t border-[#3453a7]/10 bg-white px-6 py-4 sm:space-x-0">
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>إغلاق</Button>
            <Button
              onClick={async () => {
                if (!acceptRequest) return

                const normalizedTestResults = buildDefaultTestResults(testableJuzs, juzTestResults)
                const nextReviewResults = filterReviewResultsByReviewRequestedJuzs(normalizedTestResults, juzReviewResults)

                try {
                  await persistRequestTestResults(acceptRequest.id, normalizedTestResults, nextReviewResults)
                  saveTestResults(acceptRequest.id, normalizedTestResults, nextReviewResults)
                  setJuzTestResults(normalizedTestResults)
                  setJuzReviewResults(nextReviewResults)
                  setHasReviewedTest(true)
                  setIsTestDialogOpen(false)
                  toast({ title: "نجاح", description: "تم حفظ نتائج الاختبار" })
                } catch (error) {
                  const errorMessage = getReadableErrorMessage(error)
                  console.error("Failed to save enrollment test results:", errorMessage, error)
                  toast({ title: "خطأ", description: errorMessage || "تعذر حفظ نتائج الاختبار", variant: "destructive" })
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              حفظ نتائج الاختبار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

			<Dialog open={isReviewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDraftJuzReviewResults(filterReviewResultsByReviewRequestedJuzs(juzTestResults, juzReviewResults))
        }
        setIsReviewDialogOpen(open)
      }}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden border-[#3453a7]/20 bg-white p-0 [&>button]:hidden" dir="rtl">
					<DialogHeader className="border-b border-[#3453a7]/10 bg-white px-6 py-5 text-right">
						<DialogTitle className="flex items-center justify-start gap-2 text-xl text-[#1a2332]">
							<span>العرض</span>
              <Popover open={isReviewInfoOpen} onOpenChange={setIsReviewInfoOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3453a7] text-[10px] font-bold text-white shadow-sm"
                    aria-label="توضيح نتائج العرض"
                    onMouseEnter={() => setIsReviewInfoOpen(true)}
                    onMouseLeave={() => setIsReviewInfoOpen(false)}
                    onFocus={() => setIsReviewInfoOpen(true)}
                    onBlur={() => setIsReviewInfoOpen(false)}
                  >
                    !
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="bottom"
                  className="w-[320px] rounded-2xl border border-[#3453a7]/30 bg-white px-4 py-3 text-right text-sm leading-7 text-[#1a2332] shadow-xl"
                  onMouseEnter={() => setIsReviewInfoOpen(true)}
                  onMouseLeave={() => setIsReviewInfoOpen(false)}
                >
                  <p><span className="font-bold text-emerald-700">ناجح:</span> يُعتبر كمحفوظ.</p>
                  <p><span className="font-bold text-red-700">راسب:</span> إعادة الحفظ بشكل كامل.</p>
                  <p><span className="font-bold text-sky-700">إتقان:</span> إعادة الحفظ بشكل كامل ولكن بعدد أوجه أكثر (تُعرض أجزاء الإتقان عند إضافة خطة للطالب).</p>
                </PopoverContent>
              </Popover>
						</DialogTitle>
						<DialogDescription className="leading-7 text-neutral-600">
							قيّم الأجزاء المحوّلة إلى العرض لهذا الطالب قبل تأكيد القبول.
						</DialogDescription>
					</DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
						{reviewRequestedJuzs.length === 0 ? (
							<div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
								لا توجد أجزاء محوّلة إلى العرض.
							</div>
						) : (
							reviewRequestedJuzs.map((juzNumber) => (
								<div key={juzNumber} className="flex items-center justify-between gap-3 rounded-2xl border border-[#3453a7]/20 bg-[#fcfbf7] px-4 py-4">
									<div>
										<p className="font-semibold text-[#1a2332]">الجزء {juzNumber}</p>
									</div>
									<Select
										value={draftJuzReviewResults[juzNumber]}
										onValueChange={(value: EnrollmentJuzReviewStatus) => setDraftJuzReviewResults((prev) => ({ ...prev, [juzNumber]: value }))}
									>
										<SelectTrigger className="w-[150px] bg-white">
											<SelectValue placeholder="اختر النتيجة" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="pass">ناجح</SelectItem>
											<SelectItem value="fail">راسب</SelectItem>
											<SelectItem value="needs_mastery">اتقان</SelectItem>
										</SelectContent>
									</Select>
								</div>
							))
						)}
					</div>

					<DialogFooter className="gap-2 border-t border-[#3453a7]/10 bg-white px-6 py-4 sm:space-x-0">
						<Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>إغلاق</Button>
						<Button
							onClick={async () => {
								if (!acceptRequest) return

								const nextReviewResults = filterReviewResultsByReviewRequestedJuzs(juzTestResults, draftJuzReviewResults)
								const hasMissingResults = reviewRequestedJuzs.some((juzNumber) => !nextReviewResults[juzNumber])

								if (hasMissingResults) {
									toast({ title: "خطأ", description: "يجب تحديد نتيجة كل جزء محوّل إلى العرض", variant: "destructive" })
									return
								}

								try {
									await persistRequestTestResults(acceptRequest.id, juzTestResults, nextReviewResults)
									saveTestResults(acceptRequest.id, juzTestResults, nextReviewResults)
									setJuzReviewResults(nextReviewResults)
									setDraftJuzReviewResults(nextReviewResults)
									setHasReviewedTest(true)
									setIsReviewDialogOpen(false)
									toast({ title: "نجاح", description: "تم حفظ نتائج العرض" })
								} catch (error) {
									const errorMessage = getReadableErrorMessage(error)
									console.error("Failed to save enrollment review results:", errorMessage, error)
									toast({ title: "خطأ", description: errorMessage || "تعذر حفظ نتائج العرض", variant: "destructive" })
								}
							}}
							className="bg-emerald-600 text-white hover:bg-emerald-700"
						>
							حفظ العرض
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Footer />
		</div>
	);
}