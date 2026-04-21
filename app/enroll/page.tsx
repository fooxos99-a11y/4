"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Phone, Hash, GraduationCap, BookOpen, UserPlus, ChevronDown } from "lucide-react";
import { getJuzBounds, SURAHS } from "@/lib/quran-data";
import {
  formatEnrollmentMemorizedAmount,
  getContiguousSelectedJuzRange,
  serializeEnrollmentPartialJuzRanges,
  type EnrollmentPartialJuzRange,
} from "@/lib/enrollment-test-utils";

const ALL_JUZS = Array.from({ length: 30 }, (_, index) => index + 1);
const DOUBLE_TAP_DELAY_MS = 260;

type PartialRangeDraft = {
  fromSurahNumber: number;
  fromVerseNumber: number;
  toSurahNumber: number;
  toVerseNumber: number;
};

export default function EnrollPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isMemorizedDialogOpen, setIsMemorizedDialogOpen] = useState(false);
  const [isPartialRangeDialogOpen, setIsPartialRangeDialogOpen] = useState(false);
  const [activePartialJuz, setActivePartialJuz] = useState<number | null>(null);
  const [partialRangeDraft, setPartialRangeDraft] = useState<PartialRangeDraft | null>(null);
  const [partialJuzRanges, setPartialJuzRanges] = useState<Record<number, EnrollmentPartialJuzRange>>({});
  const tapTimersRef = useRef<Record<number, number | undefined>>({});
  
  useEffect(() => {
    const fetchEnrollmentStatus = async () => {
      try {
        const response = await fetch("/api/public-enrollment", { cache: "no-store" });
        const payload = await response.json();

        if (response.ok && typeof payload.isEnrollmentOpen === "boolean") {
          setIsEnrollmentOpen(payload.isEnrollmentOpen);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingStatus(false);
      }
    };
    
    fetchEnrollmentStatus();
  }, []);
  const [formData, setFormData] = useState({
    fullName: "",
    guardianPhone: "",
    idNumber: "",
    educationalStage: "",
    selectedJuzs: [] as number[],
  });

  const serializedPartialJuzRanges = useMemo(
    () => serializeEnrollmentPartialJuzRanges(partialJuzRanges),
    [partialJuzRanges],
  );

  const memorizedSummary = useMemo(
    () => formatEnrollmentMemorizedAmount(serializedPartialJuzRanges || undefined, formData.selectedJuzs),
    [formData.selectedJuzs, serializedPartialJuzRanges],
  );

  useEffect(() => {
    return () => {
      Object.values(tapTimersRef.current).forEach((timerId) => {
        if (timerId) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value = e.target.value;
    
    // Only allow numbers for ID and Phone
    if (name === "idNumber" || name === "guardianPhone") {
      value = value.replace(/\D/g, "");
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const toggleJuzSelection = (juzNumber: number) => {
    const wasSelected = formData.selectedJuzs.includes(juzNumber);

    setFormData((current) => {
      const selectedJuzs = current.selectedJuzs.includes(juzNumber)
        ? current.selectedJuzs.filter((item) => item !== juzNumber)
        : [...current.selectedJuzs, juzNumber].sort((left, right) => left - right);

      return {
        ...current,
        selectedJuzs,
      };
    });

    if (wasSelected) {
      setPartialJuzRanges((current) => {
        if (!(juzNumber in current)) {
          return current;
        }

        const nextRanges = { ...current };
        delete nextRanges[juzNumber];
        return nextRanges;
      });
    }
  };

  const clearSelectedJuzs = () => {
    setFormData((current) => ({
      ...current,
      selectedJuzs: [],
    }));
    setPartialJuzRanges({});
  };

  const compareAyahRefs = (leftSurahNumber: number, leftVerseNumber: number, rightSurahNumber: number, rightVerseNumber: number) => {
    if (leftSurahNumber !== rightSurahNumber) {
      return leftSurahNumber - rightSurahNumber;
    }

    return leftVerseNumber - rightVerseNumber;
  };

  const getJuzSurahs = (juzNumber: number) => {
    const bounds = getJuzBounds(juzNumber);
    if (!bounds) {
      return [];
    }

    return SURAHS.filter((surah) => surah.number >= bounds.startSurahNumber && surah.number <= bounds.endSurahNumber);
  };

  const getAyahLimitsForJuz = (juzNumber: number, surahNumber: number) => {
    const bounds = getJuzBounds(juzNumber);
    const surah = SURAHS.find((item) => item.number === surahNumber);

    if (!bounds || !surah) {
      return { min: 1, max: 1 };
    }

    return {
      min: surahNumber === bounds.startSurahNumber ? bounds.startVerseNumber : 1,
      max: surahNumber === bounds.endSurahNumber ? bounds.endVerseNumber : surah.verseCount,
    };
  };

  const clampAyahNumber = (juzNumber: number, surahNumber: number, ayahNumber: number) => {
    const limits = getAyahLimitsForJuz(juzNumber, surahNumber);
    return Math.max(limits.min, Math.min(limits.max, ayahNumber));
  };

  const shouldKeepPartialDialogOpen = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("[data-slot='select-content']") ||
      target.closest("[data-radix-popper-content-wrapper]"),
    );
  };

  const handlePartialDialogOutsideInteraction = (event: Event) => {
    if (shouldKeepPartialDialogOpen(event.target)) {
      event.preventDefault();
    }
  };

  const openPartialRangeDialog = (juzNumber: number) => {
    const bounds = getJuzBounds(juzNumber);
    if (!bounds) {
      return;
    }

    const existingRange = partialJuzRanges[juzNumber];

    setActivePartialJuz(juzNumber);
    setPartialRangeDraft(existingRange ? {
      fromSurahNumber: existingRange.fromSurahNumber,
      fromVerseNumber: existingRange.fromVerseNumber,
      toSurahNumber: existingRange.toSurahNumber,
      toVerseNumber: existingRange.toVerseNumber,
    } : {
      fromSurahNumber: bounds.startSurahNumber,
      fromVerseNumber: bounds.startVerseNumber,
      toSurahNumber: bounds.endSurahNumber,
      toVerseNumber: bounds.endVerseNumber,
    });
    setIsPartialRangeDialogOpen(true);
  };

  const closePartialRangeDialog = (open: boolean) => {
    setIsPartialRangeDialogOpen(open);

    if (!open) {
      setActivePartialJuz(null);
      setPartialRangeDraft(null);
    }
  };

  const handleJuzCircleInteraction = (juzNumber: number) => {
    const currentTimer = tapTimersRef.current[juzNumber];
    if (currentTimer) {
      window.clearTimeout(currentTimer);
      tapTimersRef.current[juzNumber] = undefined;
      openPartialRangeDialog(juzNumber);
      return;
    }

    tapTimersRef.current[juzNumber] = window.setTimeout(() => {
      toggleJuzSelection(juzNumber);
      tapTimersRef.current[juzNumber] = undefined;
    }, DOUBLE_TAP_DELAY_MS);
  };

  const savePartialRangeSelection = () => {
    if (!activePartialJuz || !partialRangeDraft) {
      return;
    }

    if (
      compareAyahRefs(
        partialRangeDraft.fromSurahNumber,
        partialRangeDraft.fromVerseNumber,
        partialRangeDraft.toSurahNumber,
        partialRangeDraft.toVerseNumber,
      ) > 0
    ) {
      toast({ title: "يجب أن يكون المدى من البداية إلى النهاية بشكل صحيح", variant: "destructive" });
      return;
    }

    setPartialJuzRanges((current) => ({
      ...current,
      [activePartialJuz]: {
        juzNumber: activePartialJuz,
        fromSurahNumber: partialRangeDraft.fromSurahNumber,
        fromVerseNumber: partialRangeDraft.fromVerseNumber,
        toSurahNumber: partialRangeDraft.toSurahNumber,
        toVerseNumber: partialRangeDraft.toVerseNumber,
      },
    }));
    setFormData((current) => ({
      ...current,
      selectedJuzs: current.selectedJuzs.includes(activePartialJuz)
        ? current.selectedJuzs
        : [...current.selectedJuzs, activePartialJuz].sort((left, right) => left - right),
    }));
    closePartialRangeDialog(false);
  };

  const activeJuzSurahs = useMemo(
    () => (activePartialJuz ? getJuzSurahs(activePartialJuz) : []),
    [activePartialJuz],
  );

  const activeFromAyahs = useMemo(() => {
    if (!activePartialJuz || !partialRangeDraft) {
      return [] as number[];
    }

    const limits = getAyahLimitsForJuz(activePartialJuz, partialRangeDraft.fromSurahNumber);
    return Array.from({ length: limits.max - limits.min + 1 }, (_, index) => limits.min + index);
  }, [activePartialJuz, partialRangeDraft]);

  const activeToAyahs = useMemo(() => {
    if (!activePartialJuz || !partialRangeDraft) {
      return [] as number[];
    }

    const limits = getAyahLimitsForJuz(activePartialJuz, partialRangeDraft.toSurahNumber);
    return Array.from({ length: limits.max - limits.min + 1 }, (_, index) => limits.min + index);
  }, [activePartialJuz, partialRangeDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnrollmentOpen) {
      toast({ title: "عذرًا، التسجيل مغلق حاليًا", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const contiguousRange = getContiguousSelectedJuzRange(formData.selectedJuzs);
      const memorizedAmount = serializedPartialJuzRanges || (contiguousRange ? `${contiguousRange.fromJuz}-${contiguousRange.toJuz}` : "");
      const response = await fetch("/api/public-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          guardianPhone: formData.guardianPhone,
          idNumber: formData.idNumber,
          educationalStage: formData.educationalStage,
          memorizedAmount,
          selectedJuzs: formData.selectedJuzs,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "حدث خطأ أثناء إرسال الطلب");
      }

      toast({ title: "تم إرسال طلب الالتحاق بنجاح!", variant: "default" });
      setFormData({
        fullName: "",
        guardianPhone: "",
        idNumber: "",
        educationalStage: "",
        selectedJuzs: [],
      });
      setPartialJuzRanges({});
      setIsMemorizedDialogOpen(false);
      closePartialRangeDialog(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      // Optionally redirect or show a success message
    } catch (error: any) {
      console.error('Error submitting request:', JSON.stringify(error, null, 2)); console.error('Error raw:', error);
      toast({ title: error.message || "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white dir-rtl font-cairo">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-[#20335f] mb-2 md:mb-3">طلب الالتحاق بالمجمع</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#3453a7]/30 relative p-6 md:p-8">

            {isLoadingStatus ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                <SiteLoader size="lg" />
              </div>
            ) : !isEnrollmentOpen ? (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-600 mb-2">عذرًا، التسجيل مغلق حاليًا</h3>
                <p className="text-gray-500">تم إيقاف التسجيل في المجمع في الوقت الحالي.</p>
              </div>
            ) : (
              <>
                {isSuccess && (
                  <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-300 left-0 top-0 w-full h-full">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-green-500 animate-in zoom-in duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-[#20335f] mb-2">تم الإرسال بنجاح!</h3>
                    <p className="text-gray-500">سيتم التواصل معك قريبًا.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-[#20335f] font-semibold text-sm md:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-[#3453a7]" />
                  الاسم الثلاثي للطالب <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="guardianPhone" className="text-[#20335f] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#3453a7]" />
                  رقم ولي الأمر <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="guardianPhone"
                  name="guardianPhone"
                    maxLength={10}
                    required
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors text-right"
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="idNumber" className="text-[#20335f] font-semibold text-sm md:text-base flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#3453a7]" />
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="idNumber"
                  name="idNumber"
                    maxLength={10}
                    required
                  value={formData.idNumber}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                  placeholder="10XXXXXXXX"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="educationalStage" className="text-[#20335f] font-semibold text-sm md:text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#3453a7]" />
                  المرحلة الدراسية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="educationalStage"
                  name="educationalStage"
                  required
                  value={formData.educationalStage}
                  onChange={handleChange}
                  className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-[#3453a7] outline-none transition-colors"
                  placeholder="مثال: ثالث متوسط"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[#20335f] font-semibold text-sm md:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#3453a7]" />
                  المحفوظ <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3 rounded-xl border-2 border-gray-200 p-3">
                  <button
                    type="button"
                    onClick={() => setIsMemorizedDialogOpen(true)}
                    className="flex h-12 w-full items-center justify-between rounded-lg border border-[#3453a7]/40 bg-white px-4 text-base text-[#20335f] transition-colors hover:bg-white"
                  >
                    <span>{formData.selectedJuzs.length === 0 ? "لا يوجد حفظ سابق" : memorizedSummary}</span>
                    <ChevronDown className="h-4 w-4 text-[#b88a2c]" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 md:h-14 bg-white border border-[#3453a7]/50 hover:bg-neutral-50 text-neutral-600 font-medium text-base md:text-lg rounded-lg transition-all duration-300 flex justify-center items-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <SiteLoader color="#525252" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-neutral-600" />
                    <span>إرسال الطلب</span>
                  </>
                )}
              </button>
            </form>
            </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={isMemorizedDialogOpen} onOpenChange={setIsMemorizedDialogOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-[480px] rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-0 shadow-[0_26px_80px_rgba(18,37,84,0.14)]" dir="rtl">
          <DialogHeader className="border-b border-[#3453a7]/8 bg-transparent px-5 py-4 text-right">
            <DialogTitle className="text-right text-lg font-bold text-[#20335f]">اختيار المحفوظ</DialogTitle>
            <DialogDescription className="mt-1 text-right text-sm leading-7 text-[#60708f]">
              ضغطة واحدة تعني الجزء كامل، وضغطتان تعني بعض الجزء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-5 pt-3">
              <div className="grid grid-cols-4 justify-items-center gap-x-1.5 gap-y-2 sm:grid-cols-5">
              {ALL_JUZS.map((juzNumber) => {
                const isSelected = formData.selectedJuzs.includes(juzNumber)

                return (
                  <button
                    type="button"
                    key={juzNumber}
                    onClick={() => handleJuzCircleInteraction(juzNumber)}
                    aria-pressed={isSelected}
                    aria-label={`الجزء ${juzNumber}`}
                    className={`flex h-13 w-13 items-center justify-center rounded-full border text-[15px] font-black transition-all duration-300 ease-out ${isSelected ? "border-[#3453a7] bg-[#3453a7] text-white shadow-[0_10px_22px_rgba(52,83,167,0.24)] scale-[1.02]" : "border-[#d9e2f3] bg-white text-[#20335f] hover:border-[#3453a7]/40 hover:bg-[#f8fbff] hover:shadow-[0_6px_18px_rgba(52,83,167,0.08)]"}`}
                  >
                    {juzNumber}
                  </button>
                )
              })}
              </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsMemorizedDialogOpen(false)}
                className="h-11 rounded-full bg-[#3453a7] px-6 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#28448e] hover:shadow-[0_12px_24px_rgba(52,83,167,0.22)]"
              >
                تم
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartialRangeDialogOpen} onOpenChange={closePartialRangeDialog}>
        <DialogContent
          className="max-w-[92vw] sm:max-w-[390px] rounded-[28px] border border-black/15 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-0 shadow-[0_24px_60px_rgba(18,37,84,0.12)]"
          dir="rtl"
          onInteractOutside={handlePartialDialogOutsideInteraction}
          onPointerDownOutside={handlePartialDialogOutsideInteraction}
        >
          <DialogHeader className="border-b border-black/8 bg-transparent px-5 py-4 text-right">
            <DialogTitle className="text-right text-lg font-bold text-[#20335f]">الجزء {activePartialJuz || ""}</DialogTitle>
          </DialogHeader>

          {partialRangeDraft && activePartialJuz ? (
            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-bold text-[#20335f]">من</div>
                  <Select
                    value={String(partialRangeDraft.fromSurahNumber)}
                    onValueChange={(value) => {
                      const nextSurahNumber = Number(value);
                      const nextVerseNumber = clampAyahNumber(activePartialJuz, nextSurahNumber, partialRangeDraft.fromVerseNumber);
                      setPartialRangeDraft((current) => current ? {
                        ...current,
                        fromSurahNumber: nextSurahNumber,
                        fromVerseNumber: nextVerseNumber,
                        ...(compareAyahRefs(nextSurahNumber, nextVerseNumber, current.toSurahNumber, current.toVerseNumber) > 0
                          ? { toSurahNumber: nextSurahNumber, toVerseNumber: nextVerseNumber }
                          : {}),
                      } : current);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-black/20 bg-white text-sm font-semibold text-[#20335f] shadow-none focus-visible:border-black/30 focus-visible:ring-black/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-64 rounded-2xl border border-black/15 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
                      {activeJuzSurahs.map((surah) => (
                        <SelectItem key={`from-surah-${surah.number}`} value={String(surah.number)} className="text-right text-sm focus:bg-slate-50">
                          {surah.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(partialRangeDraft.fromVerseNumber)}
                    onValueChange={(value) => {
                      const nextVerseNumber = Number(value);
                      setPartialRangeDraft((current) => current ? {
                        ...current,
                        fromVerseNumber: nextVerseNumber,
                        ...(compareAyahRefs(current.fromSurahNumber, nextVerseNumber, current.toSurahNumber, current.toVerseNumber) > 0
                          ? { toSurahNumber: current.fromSurahNumber, toVerseNumber: nextVerseNumber }
                          : {}),
                      } : current);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-black/20 bg-white text-sm font-semibold text-[#20335f] shadow-none focus-visible:border-black/30 focus-visible:ring-black/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-64 rounded-2xl border border-black/15 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
                      {activeFromAyahs.map((ayahNumber) => (
                        <SelectItem key={`from-ayah-${ayahNumber}`} value={String(ayahNumber)} className="text-right text-sm focus:bg-slate-50">
                          {ayahNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-bold text-[#20335f]">إلى</div>
                  <Select
                    value={String(partialRangeDraft.toSurahNumber)}
                    onValueChange={(value) => {
                      const nextSurahNumber = Number(value);
                      const nextVerseNumber = clampAyahNumber(activePartialJuz, nextSurahNumber, partialRangeDraft.toVerseNumber);
                      setPartialRangeDraft((current) => current ? {
                        ...current,
                        toSurahNumber: nextSurahNumber,
                        toVerseNumber: nextVerseNumber,
                      } : current);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-black/20 bg-white text-sm font-semibold text-[#20335f] shadow-none focus-visible:border-black/30 focus-visible:ring-black/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-64 rounded-2xl border border-black/15 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
                      {activeJuzSurahs.map((surah) => (
                        <SelectItem key={`to-surah-${surah.number}`} value={String(surah.number)} className="text-right text-sm focus:bg-slate-50">
                          {surah.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(partialRangeDraft.toVerseNumber)}
                    onValueChange={(value) => {
                      const nextVerseNumber = Number(value);
                      setPartialRangeDraft((current) => current ? {
                        ...current,
                        toVerseNumber: nextVerseNumber,
                      } : current);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-black/20 bg-white text-sm font-semibold text-[#20335f] shadow-none focus-visible:border-black/30 focus-visible:ring-black/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="max-h-64 rounded-2xl border border-black/15 bg-white shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
                      {activeToAyahs.map((ayahNumber) => (
                        <SelectItem key={`to-ayah-${ayahNumber}`} value={String(ayahNumber)} className="text-right text-sm focus:bg-slate-50">
                          {ayahNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={savePartialRangeSelection}
                  className="h-11 rounded-full bg-[#3453a7] px-6 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#28448e] hover:shadow-[0_12px_24px_rgba(52,83,167,0.22)]"
                >
                  تم
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}


