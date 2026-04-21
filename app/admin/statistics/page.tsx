"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, Link2, Orbit, Percent, Trophy, Users, type LucideIcon } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { getStudyWeekEnd, getStudyWeekStart, isStudyDay } from "@/lib/study-calendar";

type DateFilter = "today" | "currentWeek" | "currentMonth" | "all" | "custom";

type CustomDateRange = {
  start: string;
  end: string;
};

type Counts = {
  circles: number;
  students: number;
};

type Totals = {
  memorized: number;
  revised: number;
  tied: number;
};

type StudentRow = {
  id: string;
  name: string | null;
  halaqah?: string | null;
};

type CircleRow = {
  id: string;
  name: string | null;
};

type PlanRow = {
  id: string;
  student_id: string;
  start_date: string | null;
  created_at: string | null;
  daily_pages: number | null;
  muraajaa_pages: number | null;
  rabt_pages: number | null;
  review_distribution_mode?: "fixed" | "weekly" | null;
  muraajaa_mode?: "daily_fixed" | "weekly_distributed" | null;
  weekly_muraajaa_min_daily_pages?: number | null;
  weekly_muraajaa_start_day?: number | null;
  weekly_muraajaa_end_day?: number | null;
  has_previous?: boolean | null;
  prev_start_surah?: number | null;
  prev_start_verse?: number | null;
  prev_end_surah?: number | null;
  prev_end_verse?: number | null;
  previous_memorization_ranges?: unknown[] | null;
  completed_juzs?: number[] | null;
};

type DailyReportRow = {
  student_id: string;
  report_date: string;
  memorization_done: boolean;
  review_done: boolean;
  linking_done: boolean;
};

type EvaluationRecord = {
  hafiz_level?: EvaluationLevelValue;
  tikrar_level?: EvaluationLevelValue;
  samaa_level?: EvaluationLevelValue;
  rabet_level?: EvaluationLevelValue;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  halaqah: string | null;
  date: string;
  status: string | null;
  evaluations: EvaluationRecord[] | EvaluationRecord | null;
};

type StudentSummary = {
  id: string;
  name: string;
  circleName: string;
  memorized: number;
  revised: number;
  tied: number;
  maxPoints: number;
  earnedPoints: number;
  percent: number;
};

type CircleSummary = {
  name: string;
  memorized: number;
  revised: number;
  tied: number;
  passedReviewSegments: number;
  passedTiedSegments: number;
  passedMemorizationSegments: number;
  passedTikrarSegments: number;
  plannedStudentsCount: number;
  expectedRecords: number;
  maxPoints: number;
  earnedPoints: number;
  totalAttend: number;
  totalRecords: number;
  evalPercent: number;
  attendPercent: number;
  memorizedPercent: number;
  tikrarPercent: number;
  revisedPercent: number;
  tiedPercent: number;
  score: number;
};

type PanelTone = {
  shellClass: string;
  titleClass: string;
  iconWrapClass: string;
  iconClass: string;
  dividerClass: string;
  bodyClass: string;
  valueClass: string;
  rankClass: string;
};

type CircleCardTone = {
  cardClass: string;
  hoverClass: string;
  glowClass: string;
  iconClass: string;
  eyebrowClass: string;
};

const TEXT = {
  title: "\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
  filter: "\u0627\u0644\u0641\u062a\u0631\u0629",
  fromDate: "\u0645\u0646",
  toDate: "\u0625\u0644\u0649",
  students: "\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628",
  circles: "\u0639\u062f\u062f \u0627\u0644\u062d\u0644\u0642\u0627\u062a",
  memorized: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u0641\u0638",
  revised: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  tied: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0631\u0628\u0637",
  topMemorizers: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u062d\u0641\u0638\u0627\u064b",
  topRevisers: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0631\u0627\u062c\u0639\u0629",
  topTied: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u0631\u0628\u0637\u0627\u064b",
  topCircles: "\u0627\u0644\u062d\u0644\u0642 \u0627\u0644\u0623\u0639\u0644\u0649 \u0625\u0646\u062c\u0627\u0632\u0627\u064b",
  browseCircles: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639",
  circleIndicators: "\u0645\u0624\u0634\u0631\u0627\u062a \u0623\u062f\u0627\u0621 \u0627\u0644\u062d\u0644\u0642",
  attendanceMetric: "\u0627\u0644\u062d\u0636\u0648\u0631",
  memorizedMetric: "\u0627\u0644\u062a\u0633\u0645\u064a\u0639",
  tikrarMetric: "\u0627\u0644\u062a\u0643\u0631\u0627\u0631",
  revisedMetric: "\u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  tiedMetric: "\u0627\u0644\u0631\u0628\u0637",
  facesUnit: "\u0648\u062c\u0647",
  noData:
    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0639\u0631\u0636\u0647\u0627 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0641\u062a\u0631\u0629",
  unknownStudent: "\u0637\u0627\u0644\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0641",
  unknownCircle: "\u062d\u0644\u0642\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0641\u0629",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a",
} as const;

const FILTER_LABELS: Record<DateFilter, string> = {
  today: "\u0627\u0644\u064a\u0648\u0645",
  currentWeek: "\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062d\u0627\u0644\u064a",
  currentMonth: "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a",
  all: "\u0643\u0644 \u0627\u0644\u0641\u062a\u0631\u0627\u062a",
  custom: "\u0645\u062e\u0635\u0635",
};

const PANEL_TONES: Record<"memorized" | "revised" | "tied" | "circles", PanelTone> = {
  memorized: {
    shellClass: "border-[#cceee1] bg-[#eefbf5]",
    titleClass: "text-[#198754]",
    iconWrapClass: "bg-[#dcf6e9]",
    iconClass: "text-[#198754]",
    dividerClass: "border-b border-[#cfeee2]",
    bodyClass: "bg-[#eefbf5]",
    valueClass: "text-[#198754]",
    rankClass: "bg-[#dcf6e9] text-[#198754]",
  },
  revised: {
    shellClass: "border-[#cdeef2] bg-[#eefbfd]",
    titleClass: "text-[#177e94]",
    iconWrapClass: "bg-[#def4f8]",
    iconClass: "text-[#177e94]",
    dividerClass: "border-b border-[#cfeaf0]",
    bodyClass: "bg-[#eefbfd]",
    valueClass: "text-[#177e94]",
    rankClass: "bg-[#def4f8] text-[#177e94]",
  },
  tied: {
    shellClass: "border-[#ddd8f8] bg-[#f5f2ff]",
    titleClass: "text-[#6f60bd]",
    iconWrapClass: "bg-[#e8e2ff]",
    iconClass: "text-[#6f60bd]",
    dividerClass: "border-b border-[#e3ddf8]",
    bodyClass: "bg-[#f5f2ff]",
    valueClass: "text-[#6f60bd]",
    rankClass: "bg-[#e8e2ff] text-[#6f60bd]",
  },
  circles: {
    shellClass: "border-[#d9def7] bg-[#f4f6ff]",
    titleClass: "text-[#5a67b1]",
    iconWrapClass: "bg-[#e5e9ff]",
    iconClass: "text-[#5a67b1]",
    dividerClass: "border-b border-[#dee3f8]",
    bodyClass: "bg-[#f4f6ff]",
    valueClass: "text-[#5a67b1]",
    rankClass: "bg-[#e5e9ff] text-[#5a67b1]",
  },
};

const CIRCLE_CARD_TONES: CircleCardTone[] = [
  {
    cardClass: "border-[#d9e1f7] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#f7f4ff_100%)] shadow-[0_20px_45px_-30px_rgba(90,103,177,0.55)] hover:border-[#bcc8ef]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(90,103,177,0.6)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#5a67b1]",
    eyebrowClass: "text-[#7c89c7]",
  },
  {
    cardClass: "border-[#d9eadf] bg-[linear-gradient(135deg,#f7fff8_0%,#eaf9ee_52%,#f6fff4_100%)] shadow-[0_20px_45px_-30px_rgba(25,135,84,0.45)] hover:border-[#b9ddc5]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(25,135,84,0.5)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#198754]",
    eyebrowClass: "text-[#4b9b74]",
  },
  {
    cardClass: "border-[#f0dfc2] bg-[linear-gradient(135deg,#fffaf2_0%,#fff2da_52%,#fff8ec_100%)] shadow-[0_20px_45px_-30px_rgba(204,132,32,0.42)] hover:border-[#e5ca97]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(204,132,32,0.48)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#c47a16]",
    eyebrowClass: "text-[#cf8e38]",
  },
  {
    cardClass: "border-[#e1d8f7] bg-[linear-gradient(135deg,#faf7ff_0%,#f0eaff_52%,#fbf8ff_100%)] shadow-[0_20px_45px_-30px_rgba(111,96,189,0.45)] hover:border-[#ccc0ef]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(111,96,189,0.5)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#6f60bd]",
    eyebrowClass: "text-[#8d7ac8]",
  },
  {
    cardClass: "border-[#d5ecee] bg-[linear-gradient(135deg,#f5feff_0%,#e7f8f9_52%,#f4fcfc_100%)] shadow-[0_20px_45px_-30px_rgba(23,126,148,0.42)] hover:border-[#b8dfe2]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(23,126,148,0.48)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#177e94]",
    eyebrowClass: "text-[#4f97a6]",
  },
  {
    cardClass: "border-[#f1d9df] bg-[linear-gradient(135deg,#fff7f8_0%,#fbe9ec_52%,#fff6f7_100%)] shadow-[0_20px_45px_-30px_rgba(185,76,103,0.42)] hover:border-[#e9bcc8]",
    hoverClass: "hover:shadow-[0_28px_50px_-28px_rgba(185,76,103,0.48)]",
    glowClass: "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]",
    iconClass: "text-[#b94c67]",
    eyebrowClass: "text-[#c47188]",
  },
];

const MAX_EVALUATION_POINTS_PER_STUDY_DAY = 40;

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value);
}

function getCircleCardTone(circleName: string) {
  let hash = 0;

  for (const char of circleName.trim()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return CIRCLE_CARD_TONES[hash % CIRCLE_CARD_TONES.length];
}

function getDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function countStudyDaysInRange(start: Date, end: Date) {
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const normalizedEnd = new Date(end);
  normalizedEnd.setHours(0, 0, 0, 0);

  let count = 0;

  while (cursor <= normalizedEnd) {
    if (isStudyDay(cursor)) {
      count += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

function getDateRange(filter: DateFilter, customRange: CustomDateRange) {
  const end = new Date();
  const start = new Date();

  if (filter === "today") {
    return { start: new Date(start.setHours(0, 0, 0, 0)), end };
  }

  if (filter === "currentWeek") {
    return { start: getStudyWeekStart(), end: getStudyWeekEnd() };
  }

  if (filter === "currentMonth") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (filter === "custom") {
    return {
      start: new Date(`${customRange.start}T00:00:00`),
      end: new Date(`${customRange.end}T23:59:59`),
    };
  }

  start.setFullYear(2020, 0, 1);
  return { start, end };
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {};
  }

  return value ?? {};
}

function getDailyCompletionFlags(record?: AttendanceRow, dailyReport?: DailyReportRow) {
  const evaluation = record ? getEvaluationRecord(record.evaluations) : {};

  return {
    memorizationDone: Boolean(dailyReport?.memorization_done) || isPassingMemorizationLevel(evaluation.hafiz_level ?? null),
    reviewDone: Boolean(dailyReport?.review_done) || isPassingMemorizationLevel(evaluation.samaa_level ?? null),
    linkingDone: Boolean(dailyReport?.linking_done) || isPassingMemorizationLevel(evaluation.rabet_level ?? null),
  };
}

function createStudentSummary(id: string, name: string, circleName: string): StudentSummary {
  return {
    id,
    name,
    circleName,
    memorized: 0,
    revised: 0,
    tied: 0,
    maxPoints: 0,
    earnedPoints: 0,
    percent: 0,
  };
}

function createCircleSummary(name: string): CircleSummary {
  return {
    name,
    memorized: 0,
    revised: 0,
    tied: 0,
    passedReviewSegments: 0,
    passedTiedSegments: 0,
    passedMemorizationSegments: 0,
    passedTikrarSegments: 0,
    plannedStudentsCount: 0,
    expectedRecords: 0,
    maxPoints: 0,
    earnedPoints: 0,
    totalAttend: 0,
    totalRecords: 0,
    evalPercent: 0,
    attendPercent: 0,
    memorizedPercent: 0,
    tikrarPercent: 0,
    revisedPercent: 0,
    tiedPercent: 0,
    score: 0,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(value * 10) / 10);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
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

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#3453a7]/20 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-[#6b7280]">{label}</span>
        <span className={`rounded-full p-2 ${accent}`}>
          <Icon className={iconClassName ?? "h-5 w-5"} />
        </span>
      </div>
      <div className="text-3xl font-extrabold text-[#1a2332]">{value}</div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  trackClass,
  fillClass,
}: {
  label: string;
  value: number;
  trackClass: string;
  fillClass: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_72px] items-center gap-3 text-xs font-bold text-[#5f6b7a]">
      <span className="text-left tabular-nums text-[#4c5a6a]">{formatPercent(safeValue)}</span>
      <div className={`h-2.5 overflow-hidden rounded-full ${trackClass}`}>
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${safeValue}%` }} />
      </div>
      <span className="text-right whitespace-nowrap">{label}</span>
    </div>
  );
}

function CircleIndicatorsCard({ items }: { items: CircleSummary[] }) {
  return (
    <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#111827]">
          <span className="text-sm font-black text-[#111827]">{TEXT.circleIndicators}</span>
        </div>
        <Orbit className="h-4 w-4 text-[#60a5fa]" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.name}
              className="space-y-3 rounded-[20px] border border-[#edf0f3] bg-[#fcfdff] p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]"
            >
              <div className="text-right text-sm font-black text-[#1f2937]">{item.name}</div>
              <div className="space-y-2.5">
                <MetricBar label={TEXT.attendanceMetric} value={item.attendPercent} trackClass="bg-[#fff3bf]" fillClass="bg-[#facc15]" />
                <MetricBar label={TEXT.memorizedMetric} value={item.memorizedPercent} trackClass="bg-[#dcfce7]" fillClass="bg-[#22c55e]" />
                <MetricBar label={TEXT.tikrarMetric} value={item.tikrarPercent} trackClass="bg-[#d1fae5]" fillClass="bg-[#10b981]" />
                <MetricBar label={TEXT.revisedMetric} value={item.revisedPercent} trackClass="bg-[#dbeafe]" fillClass="bg-[#3b82f6]" />
                <MetricBar label={TEXT.tiedMetric} value={item.tiedPercent} trackClass="bg-[#ede9fe]" fillClass="bg-[#8b5cf6]" />
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function SectionShell({
  title,
  open,
  onToggle,
  icon: Icon,
  shellClass,
  titleClass,
  iconWrapClass,
  iconClass,
  dividerClass,
  bodyClass,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  icon: LucideIcon;
  shellClass: string;
  titleClass: string;
  iconWrapClass: string;
  iconClass: string;
  dividerClass: string;
  bodyClass: string;
  children: ReactNode;
}) {
  return (
    <section className={`self-start overflow-hidden rounded-[20px] border shadow-sm ${shellClass}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`grid w-full grid-cols-[28px_1fr_24px] items-center gap-3 px-4 py-4 text-right ${open ? dividerClass : ""}`}
      >
        <span className={`flex h-7 w-7 items-center justify-center justify-self-start rounded-full ${iconWrapClass}`}>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </span>
        <div className="min-w-0 justify-self-center">
          <h2 className={`truncate whitespace-nowrap text-[15px] font-extrabold sm:text-lg ${titleClass}`}>{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 justify-self-end ${iconClass} transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
      </button>
      {open ? <div className={`px-4 py-2 ${bodyClass}`}>{children}</div> : null}
    </section>
  );
}

function EmptyState() {
  return <div className="px-4 py-10 text-center text-sm font-semibold text-[#7c6f57]">{TEXT.noData}</div>;
}

function StudentRowItem({
  item,
  rank,
  value,
  valueClass,
  rankClass,
}: {
  item: StudentSummary;
  rank: number;
  value: string;
  valueClass: string;
  rankClass: string;
}) {
  return (
    <div className="py-3.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4" dir="ltr">
        <div className={`shrink-0 text-left text-sm font-black ${valueClass}`}>{value}</div>
        <div className="min-w-0 text-right" dir="rtl">
          <div className="truncate text-[14px] font-bold text-[#4d5870] sm:text-[15px]">{item.name}</div>
          <div className="truncate text-[11px] font-semibold text-[#7b8794] sm:text-xs">{item.circleName}</div>
        </div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${rankClass}`}>
          {rank}
        </span>
      </div>
    </div>
  );
}

function CircleRowItem({
  item,
  rank,
  valueClass,
  rankClass,
}: {
  item: CircleSummary;
  rank: number;
  valueClass: string;
  rankClass: string;
}) {
  return (
    <div className="py-3.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4" dir="ltr">
        <div className={`shrink-0 text-left text-sm font-black ${valueClass}`}>{formatPercent(item.score)}</div>
        <div className="min-w-0 truncate text-right text-[14px] font-bold text-[#4d5870] sm:text-[15px]" dir="rtl">
          {item.name}
        </div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${rankClass}`}>
          {rank}
        </span>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإحصائيات");
  const initialCustomRange = {
    start: getDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getDateInputValue(new Date()),
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>("currentMonth");
  const [customRange, setCustomRange] = useState<CustomDateRange>(initialCustomRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Counts>({ circles: 0, students: 0 });
  const [totals, setTotals] = useState<Totals>({ memorized: 0, revised: 0, tied: 0 });
  const [allCircles, setAllCircles] = useState<CircleRow[]>([]);
  const [topMemorizers, setTopMemorizers] = useState<StudentSummary[]>([]);
  const [topRevisers, setTopRevisers] = useState<StudentSummary[]>([]);
  const [topTied, setTopTied] = useState<StudentSummary[]>([]);
  const [topCircles, setTopCircles] = useState<CircleSummary[]>([]);
  const [openSections, setOpenSections] = useState({ memorized: true, revised: true, tied: true, circles: true });
  const customStartRef = useRef<HTMLInputElement | null>(null);
  const customEndRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authVerified) {
      return;
    }

    void fetchStatistics();
  }, [authVerified, dateFilter, customRange.end, customRange.start]);

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  function handleCustomStartChange(value: string) {
    setCustomRange((current) => ({
      ...current,
      start: value,
      end: value > current.end ? value : current.end,
    }));
  }

  function handleDateFilterChange(nextFilter: DateFilter) {
    setDateFilter(nextFilter);
  }

  async function fetchStatistics() {
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams({ filter: dateFilter });
      if (dateFilter === "custom") {
        searchParams.set("start", customRange.start);
        searchParams.set("end", customRange.end);
      }

      const response = await fetch(`/api/statistics/summary?${searchParams.toString()}`, { cache: "no-store" });
      const payload = await response.json();

      setCounts(payload.counts || { circles: 0, students: 0 });
      setTotals(payload.totals || { memorized: 0, revised: 0, tied: 0 });
      setTopMemorizers(payload.topMemorizers || []);
      setTopRevisers(payload.topRevisers || []);
      setTopTied(payload.topTied || []);
      setTopCircles(payload.topCircles || []);
      setAllCircles(payload.allCircles || []);
      setError(typeof payload.error === "string" ? payload.error : "");
    } catch (caughtError) {
      const message = getReadableErrorMessage(caughtError);
      setError(`${TEXT.loadError}: ${message}`);
      setTopMemorizers([]);
      setTopRevisers([]);
      setTopTied([]);
      setTopCircles([]);
      setTotals({ memorized: 0, revised: 0, tied: 0 });
      setCounts({ circles: 0, students: 0 });
      setAllCircles([]);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !authVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf9]" dir="rtl">
        <SiteLoader size="md" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <section className="p-2 md:p-0">
            <div className="flex flex-col gap-4">
              <div className="max-w-2xl text-right">
                <h1 className="text-3xl font-black text-[#1a2332] md:text-4xl">{TEXT.title}</h1>
              </div>
              <div className="w-full max-w-xs text-right">
                <div className="mb-2 pr-1 text-sm font-extrabold text-[#475569]">{TEXT.filter}</div>
                <div className="relative">
                  <input
                    ref={customStartRef}
                    type="date"
                    className="sr-only"
                    value={customRange.start}
                    max={customRange.end}
                    onChange={(event) => handleCustomStartChange(event.target.value)}
                  />
                  <input
                    ref={customEndRef}
                    type="date"
                    className="sr-only"
                    value={customRange.end}
                    min={customRange.start}
                    onChange={(event) =>
                      setCustomRange((current) => ({
                        ...current,
                        end: event.target.value,
                      }))
                    }
                  />
                  <select
                    className="w-full appearance-none rounded-xl border border-[#d9e2ec] bg-white py-2.5 pl-10 pr-4 text-right text-sm font-bold text-[#1a2332] shadow-sm outline-none transition focus:border-[#3453a7]/50"
                    value={dateFilter}
                    onChange={(event) => handleDateFilterChange(event.target.value as DateFilter)}
                  >
                    {Object.entries(FILTER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                </div>
                {dateFilter === "custom" ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-xl border border-[#d9e2ec] bg-white px-3 py-2.5 text-right text-sm font-bold text-[#1a2332] shadow-sm transition hover:border-[#3453a7]/50"
                      onClick={() => openDatePicker(customStartRef.current)}
                    >
                      <span className="block text-[11px] font-extrabold text-[#64748b]">{TEXT.fromDate}</span>
                      <span className="mt-1 block">
                        {customRange.start ? formatDisplayDate(customRange.start) : "\u0627\u062e\u062a\u0631 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0645\u0646"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-[#d9e2ec] bg-white px-3 py-2.5 text-right text-sm font-bold text-[#1a2332] shadow-sm transition hover:border-[#3453a7]/50"
                      onClick={() => openDatePicker(customEndRef.current)}
                    >
                      <span className="block text-[11px] font-extrabold text-[#64748b]">{TEXT.toDate}</span>
                      <span className="mt-1 block">
                        {customRange.end ? formatDisplayDate(customRange.end) : "\u0627\u062e\u062a\u0631 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0625\u0644\u0649"}
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

          </section>

          {loading ? (
            <div className="flex min-h-[55vh] justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : (
            <>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
              ) : null}

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard icon={Users} label={TEXT.students} value={formatNumber(counts.students)} accent="bg-[#e8f3f1] text-[#0f766e]" />
                <StatCard icon={Trophy} label={TEXT.circles} value={formatNumber(counts.circles)} accent="bg-[#fbf2d9] text-[#b88710]" />
                <StatCard icon={BookOpen} label={TEXT.memorized} value={formatNumber(totals.memorized)} accent="bg-[#e9f7ec] text-[#1f8b4c]" iconClassName="h-6 w-6" />
                <StatCard icon={Orbit} label={TEXT.revised} value={formatNumber(totals.revised)} accent="bg-[#ebf2ff] text-[#2563eb]" />
                <StatCard icon={Percent} label={TEXT.tied} value={formatNumber(totals.tied)} accent="bg-[#f4ebff] text-[#7c3aed]" />
              </section>

              <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-4">
                <SectionShell
                  title={TEXT.topMemorizers}
                  open={openSections.memorized}
                  onToggle={() => setOpenSections((current) => ({ ...current, memorized: !current.memorized }))}
                  icon={BookOpen}
                  {...PANEL_TONES.memorized}
                >
                  <div className="divide-y divide-[#cfeee2]">
                    {topMemorizers.length > 0 ? (
                      topMemorizers.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.memorized)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.memorized.valueClass}
                          rankClass={PANEL_TONES.memorized.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topRevisers}
                  open={openSections.revised}
                  onToggle={() => setOpenSections((current) => ({ ...current, revised: !current.revised }))}
                  icon={Orbit}
                  {...PANEL_TONES.revised}
                >
                  <div className="divide-y divide-[#cfeaf0]">
                    {topRevisers.length > 0 ? (
                      topRevisers.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.revised)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.revised.valueClass}
                          rankClass={PANEL_TONES.revised.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topTied}
                  open={openSections.tied}
                  onToggle={() => setOpenSections((current) => ({ ...current, tied: !current.tied }))}
                  icon={Link2}
                  {...PANEL_TONES.tied}
                >
                  <div className="divide-y divide-[#e3ddf8]">
                    {topTied.length > 0 ? (
                      topTied.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.tied)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.tied.valueClass}
                          rankClass={PANEL_TONES.tied.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topCircles}
                  open={openSections.circles}
                  onToggle={() => setOpenSections((current) => ({ ...current, circles: !current.circles }))}
                  icon={Trophy}
                  {...PANEL_TONES.circles}
                >
                  <div className="divide-y divide-[#dee3f8]">
                    {topCircles.length > 0 ? (
                      topCircles.map((item, index) => (
                        <CircleRowItem
                          key={`${item.name}-${index}`}
                          item={item}
                          rank={index + 1}
                          valueClass={PANEL_TONES.circles.valueClass}
                          rankClass={PANEL_TONES.circles.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>
              </section>

              <CircleIndicatorsCard items={topCircles} />

              <section className="space-y-3">
                <div className="text-sm font-black text-[#1a2332]">{TEXT.browseCircles}</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {allCircles.map((circle) => (
                    (() => {
                      const tone = getCircleCardTone(circle.name || TEXT.unknownCircle);

                      return (
                        <Link
                          key={circle.id}
                          href={`/admin/statistics/circles/${encodeURIComponent(circle.name || TEXT.unknownCircle)}`}
                          className={`group relative overflow-hidden rounded-[28px] border p-5 transition duration-200 hover:-translate-y-1 ${tone.cardClass} ${tone.hoverClass}`}
                        >
                          <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 ${tone.glowClass}`} />
                          <div className="relative flex items-start justify-between gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm transition group-hover:scale-105 ${tone.iconClass}`}>
                              <BookOpen className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="relative mt-6 text-right">
                            <div className={`text-[13px] font-extrabold tracking-[0.16em] ${tone.eyebrowClass}`}>تقرير الحلقة</div>
                            <div className="mt-2 line-clamp-2 text-lg font-black leading-8 text-[#1a2332]">{circle.name || TEXT.unknownCircle}</div>
                          </div>
                        </Link>
                      );
                    })()
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}





