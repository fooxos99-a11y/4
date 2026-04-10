"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { getStudyWeekStart, isStudyDay } from "@/lib/study-calendar";

type DayStatus = "absent" | "late" | "present-only" | "memorized" | "review" | "tied" | "review-tied" | "complete" | "none";

type StudentCardData = {
  id: string;
  name: string;
  memorized: number;
  revised: number;
  tied: number;
  presentCount: number;
  absentCount: number;
  memorizationCompletedCount: number;
  reviewCompletedCount: number;
  linkingCompletedCount: number;
  tikrarCompletedCount: number;
  statuses: Array<{ date: string; status: DayStatus }>;
  totalActivity: number;
};

const TEXT = {
  titleSuffix: "تقارير الأسابيع",
  currentWeek: "الأسبوع الحالي",
  previousWeek: "الأسبوع السابق",
  olderWeeks: "قبل {count} أسابيع",
  noStudents: "لا يوجد طلاب مسجلون في هذه الحلقة",
  loadError: "تعذر تحميل بيانات الحلقة",
  weeklyAttendance: "حضور",
  weeklyAbsent: "غياب",
  memorizationExecution: "الحفظ",
  tikrar: "التكرار",
  reviewLabel: "المراجعة",
  linkingLabel: "الربط",
  memorizedPages: "صفحات الحفظ",
  revisedPages: "صفحات المراجعة",
  tiedPages: "صفحات الربط",
  memorized: "حافظ فقط",
  revised: "مراجعة فقط",
  tied: "ربط فقط",
  reviewTied: "ربط ومراجعة فقط",
  presentOnly: "حاضر فقط",
  absent: "غياب",
  notEvaluated: "لم يتم التقييم",
  complete: "كامل",
  unknownStudent: "طالب غير معرف",
};

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value);
}

function getStudyWeekLabel(weekOffset: number) {
  if (weekOffset === 0) {
    return TEXT.currentWeek;
  }

  if (weekOffset === 1) {
    return TEXT.previousWeek;
  }

  return TEXT.olderWeeks.replace("{count}", new Intl.NumberFormat("ar-SA").format(weekOffset));
}

function getStudyWeek(weekOffset: number) {
  const start = getStudyWeekStart();
  start.setDate(start.getDate() - weekOffset * 7);

  const dates = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return formatDateForQuery(date);
  });

  return {
    dates,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    label: getStudyWeekLabel(weekOffset),
  };
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatRatio(completed: number, target: number) {
  return `${formatCount(completed)}/${formatCount(target)}`;
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [candidate.message, candidate.error, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(" - ");
    }
  }

  return "حدث خطأ غير معروف أثناء تحميل البيانات";
}

function getStatusColor(status: DayStatus) {
  switch (status) {
    case "absent":
      return "bg-[#ef4444]";
    case "late":
      return "border border-[#d1d5db] bg-white";
    case "present-only":
      return "bg-[#22d3ee]";
    case "memorized":
      return "bg-[#4ade80]";
    case "review":
      return "bg-[#3b82f6]";
    case "tied":
      return "bg-[#facc15]";
    case "review-tied":
      return "bg-[#8b5cf6]";
    case "complete":
      return "bg-[#15803d]";
    default:
      return "bg-[#e5e7eb]";
  }
}

function ProgressRow({
  label,
  completed,
  target,
  barClass,
  badgeClass,
}: {
  label: string;
  completed: number;
  target: number;
  barClass: string;
  badgeClass: string;
}) {
  const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#334155]">{label}</div>
        <div className={`rounded-full px-3 py-1 text-sm font-black ${badgeClass}`}>{formatRatio(completed, target)}</div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf1f5]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MetricSummaryPill({ label, value, toneClass }: { label: string; value: string; toneClass: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-bold text-[#64748b]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#1f2937]">{value}</div>
    </div>
  );
}

type CircleWeeklyReportsProps = {
  circleName: string;
  backHref: string;
  backLabel: string;
  showBackButton?: boolean;
};

export function CircleWeeklyReports({ circleName, backHref, backLabel, showBackButton = true }: CircleWeeklyReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasPreviousWeek, setHasPreviousWeek] = useState(false);
  const studyWeek = useMemo(() => getStudyWeek(weekOffset), [weekOffset]);
  const studyDates = studyWeek.dates;
  const currentStudyDate = formatDateForQuery(new Date());
  const targetStudyDates = weekOffset === 0
    ? studyDates.filter((date) => isStudyDay(date) && date <= currentStudyDate)
    : studyDates.filter((date) => isStudyDay(date));
  const attendanceTargetCount = targetStudyDates.length;
  const executionTargetCount = targetStudyDates.length;
  const memorizationTargetCount = executionTargetCount;
  const reviewTargetCount = executionTargetCount;
  const linkingTargetCount = executionTargetCount;
  const tikrarTargetCount = executionTargetCount;

  useEffect(() => {
    async function fetchCircleData() {
      if (!circleName) {
        setStudents([]);
        setHasPreviousWeek(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/weekly-reports?circle=${encodeURIComponent(circleName)}&weekOffset=${weekOffset}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "تعذر تحميل بيانات الحلقة");
        }

        setHasPreviousWeek(Boolean(payload?.hasPreviousWeek));
        setStudents(Array.isArray(payload?.students) ? payload.students : []);
        setError(String(payload?.error || ""));
      } catch (caughtError) {
        const message = getReadableErrorMessage(caughtError);
        setError(`${TEXT.loadError}: ${message}`);
        setHasPreviousWeek(false);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchCircleData();
  }, [circleName, weekOffset]);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className={`grid items-center ${showBackButton ? "grid-cols-[48px_1fr_48px]" : "grid-cols-1"}`}>
            {showBackButton ? (
              <Link
                href={backHref}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#dccba0] bg-white text-[#1a2332] shadow-sm transition hover:border-[#3453a7]"
                aria-label={backLabel}
              >
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            ) : null}
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1f2937]">{TEXT.titleSuffix}</h1>
              <p className="mt-2 text-sm font-bold text-[#64748b]">{circleName}</p>
            </div>
            {showBackButton ? <div /> : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : students.length === 0 ? (
            <div className="rounded-[28px] border border-[#e6dfcb] bg-white px-6 py-16 text-center text-lg font-bold text-[#7b8794] shadow-sm">
              {TEXT.noStudents}
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-[#e5e7eb] bg-[#fcfcfb] px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => Math.max(0, currentOffset - 1))}
                      disabled={weekOffset === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الرجوع للأسبوع الأحدث"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="min-w-[118px] text-center text-sm font-black text-[#1f2937]">{studyWeek.label}</span>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => currentOffset + 1)}
                      disabled={!hasPreviousWeek}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الانتقال إلى الأسبوع الأقدم"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => (
                  <article key={student.id} className="overflow-hidden rounded-[28px] border border-[#dde6f0] bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="min-w-0 text-right">
                          <div className="truncate text-2xl font-black text-[#1f2937]">{student.name}</div>
                        </div>
                        <Users className="mt-1 h-5 w-5 shrink-0 text-[#6a8fbf]" />
                      </div>

                      <div className="mb-5 rounded-[24px] border border-[#eef2f6] bg-[#fcfdff] p-4">
                        <div className="space-y-4">
                          <ProgressRow
                            label={TEXT.weeklyAttendance}
                            completed={student.presentCount}
                            target={attendanceTargetCount}
                            barClass="bg-[#22c55e]"
                            badgeClass="bg-[#ecfdf5] text-[#15803d]"
                          />
                          <ProgressRow
                            label={TEXT.memorizationExecution}
                            completed={student.memorizationCompletedCount}
                            target={memorizationTargetCount}
                            barClass="bg-[#16a34a]"
                            badgeClass="bg-[#f0fdf4] text-[#166534]"
                          />
                          <ProgressRow
                            label={TEXT.reviewLabel}
                            completed={student.reviewCompletedCount}
                            target={reviewTargetCount}
                            barClass="bg-[#2563eb]"
                            badgeClass="bg-[#eff6ff] text-[#1d4ed8]"
                          />
                          <ProgressRow
                            label={TEXT.linkingLabel}
                            completed={student.linkingCompletedCount}
                            target={linkingTargetCount}
                            barClass="bg-[#f59e0b]"
                            badgeClass="bg-[#fffbeb] text-[#b45309]"
                          />
                          <ProgressRow
                            label={TEXT.tikrar}
                            completed={student.tikrarCompletedCount}
                            target={tikrarTargetCount}
                            barClass="bg-[#0f766e]"
                            badgeClass="bg-[#f0fdfa] text-[#0f766e]"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-[#e2e8f0] pt-4">
                          <MetricSummaryPill label={TEXT.memorizedPages} value={formatMetric(student.memorized)} toneClass="bg-[#f0fdf4]" />
                          <MetricSummaryPill label={TEXT.revisedPages} value={formatMetric(student.revised)} toneClass="bg-[#eff6ff]" />
                          <MetricSummaryPill label={TEXT.tiedPages} value={formatMetric(student.tied)} toneClass="bg-[#fffbeb]" />
                        </div>
                      </div>

                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}