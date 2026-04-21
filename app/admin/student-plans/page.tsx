"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { SiteLoader } from "@/components/ui/site-loader"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Target,
  Calendar,
  BookMarked,
  BarChart3,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  SURAHS,
  calculateTotalPages,
  calculateTotalDays,
  getAdjustedPlanPreviewRange,
  getContiguousCompletedJuzRange,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getNextAyahReference,
  getPendingMasteryJuzs,
  getPlanMemorizedRanges,
  getPreviousMemorizationBoundary,
  hasScatteredCompletedJuzs,
  getPageFloatForAyah,
  getPlanMemorizedRange,
  normalizePreviousMemorizationRanges,
  resolvePlanTotalDays,
  resolvePlanTotalPages,
  subtractMemorizedRangeFromRanges,
  getSurahJuzNumbers,
  type PreviousMemorizationRange,
} from "@/lib/quran-data";
import { getSaudiDateString } from "@/lib/saudi-time";
import { formatJuzList } from "@/lib/enrollment-test-utils"
import {
  buildWeeklyReviewPlan,
  formatReviewPagesLabel,
  getWeekdayLabel,
  getWeeklyDayRange,
  WEEKDAY_OPTIONS,
  WEEKLY_REVIEW_MIN_OPTIONS,
  type ReviewMode,
} from "@/lib/weekly-review"

interface Circle {
  id: string;
  name: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  halaqah: string;
  account_number: number;
  completed_juzs?: number[];
  current_juzs?: number[];
  memorized_start_surah?: number | null;
  memorized_start_verse?: number | null;
  memorized_end_surah?: number | null;
  memorized_end_verse?: number | null;
  memorized_ranges?: PreviousMemorizationRange[] | null;
}

interface StudentPlan {
  id: string;
  student_id: string;
  start_surah_number: number;
  start_surah_name: string;
  start_verse?: number | null;
  end_surah_number: number;
  end_surah_name: string;
  end_verse?: number | null;
  daily_pages: number;
  total_pages: number;
  total_days: number;
  start_date: string;
  created_at: string;
  has_previous?: boolean;
  prev_start_surah?: number | null;
  prev_start_verse?: number | null;
  prev_end_surah?: number | null;
  prev_end_verse?: number | null;
  previous_memorization_ranges?: PreviousMemorizationRange[] | null;
  muraajaa_pages?: number | null;
  rabt_pages?: number | null;
  muraajaa_mode?: ReviewMode | null;
  weekly_muraajaa_total_pages?: number | null;
  weekly_muraajaa_min_daily_pages?: number | null;
  weekly_muraajaa_start_day?: number | null;
  weekly_muraajaa_end_day?: number | null;
}

interface PreviousRangeDraft {
  id: string;
  startSurah: string;
  startVerse: string;
  endSurah: string;
  endVerse: string;
}

function createPreviousRangeDraft(range?: PreviousMemorizationRange | null): PreviousRangeDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startSurah: range?.startSurahNumber ? String(range.startSurahNumber) : "",
    startVerse: range?.startVerseNumber ? String(range.startVerseNumber) : "",
    endSurah: range?.endSurahNumber ? String(range.endSurahNumber) : "",
    endVerse: range?.endVerseNumber ? String(range.endVerseNumber) : "",
  };
}

function buildPreviousRangeDrafts(ranges: PreviousMemorizationRange[]) {
  return ranges.length > 0 ? ranges.map((range) => createPreviousRangeDraft(range)) : [createPreviousRangeDraft()];
}

function getEditablePlanPreviousRanges(plan: StudentPlan | null | undefined) {
  if (!plan) return [] as PreviousMemorizationRange[];

  const normalizedRanges = normalizePreviousMemorizationRanges(plan.previous_memorization_ranges);
  if (normalizedRanges.length > 0) {
    return normalizedRanges;
  }

  if (plan.prev_start_surah && plan.prev_end_surah) {
    const endSurah = SURAHS.find((surah) => surah.number === plan.prev_end_surah);
    return [{
      startSurahNumber: plan.prev_start_surah,
      startVerseNumber: plan.prev_start_verse || 1,
      endSurahNumber: plan.prev_end_surah,
      endVerseNumber: plan.prev_end_verse || endSurah?.verseCount || 1,
    }];
  }

  return [] as PreviousMemorizationRange[];
}

function getDraftPreviousRanges(drafts: PreviousRangeDraft[]) {
  return drafts.flatMap((range) => {
    if (!range.startSurah || !range.endSurah || !range.endVerse) {
      return [] as PreviousMemorizationRange[];
    }

    return [{
      startSurahNumber: parseInt(range.startSurah, 10),
      startVerseNumber: range.startVerse ? parseInt(range.startVerse, 10) : 1,
      endSurahNumber: parseInt(range.endSurah, 10),
      endVerseNumber: parseInt(range.endVerse, 10),
    }];
  });
}

function getStudentMemorizedRangesForManagement(student: Student) {
  const storedRanges = normalizePreviousMemorizationRanges(student.memorized_ranges);
  if (storedRanges.length > 0) {
    return storedRanges;
  }

  if (student.memorized_start_surah && student.memorized_end_surah) {
    return [{
      startSurahNumber: student.memorized_start_surah,
      startVerseNumber: student.memorized_start_verse || 1,
      endSurahNumber: student.memorized_end_surah,
      endVerseNumber: student.memorized_end_verse || SURAHS.find((surah) => surah.number === student.memorized_end_surah)?.verseCount || 1,
    }];
  }

  return Array.from(new Set((student.completed_juzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30)))
    .sort((left, right) => left - right)
    .map((juzNumber) => getJuzBounds(juzNumber))
    .filter((bounds): bounds is NonNullable<ReturnType<typeof getJuzBounds>> => Boolean(bounds))
    .map((bounds) => ({
      startSurahNumber: bounds.startSurahNumber,
      startVerseNumber: bounds.startVerseNumber,
      endSurahNumber: bounds.endSurahNumber,
      endVerseNumber: bounds.endVerseNumber,
    }));
}

function formatMemorizedRangeLabel(range: PreviousMemorizationRange) {
  const matchingJuzNumber = Array.from({ length: 30 }, (_, index) => index + 1).find((juzNumber) => {
    const bounds = getJuzBounds(juzNumber);
    return bounds
      && bounds.startSurahNumber === range.startSurahNumber
      && bounds.startVerseNumber === range.startVerseNumber
      && bounds.endSurahNumber === range.endSurahNumber
      && bounds.endVerseNumber === range.endVerseNumber;
  });

  if (matchingJuzNumber) {
    return `الجزء ${matchingJuzNumber}`;
  }

  const startSurah = SURAHS.find((surah) => surah.number === range.startSurahNumber)?.name || "السورة";
  const endSurah = SURAHS.find((surah) => surah.number === range.endSurahNumber)?.name || "السورة";
  return `من ${startSurah} ${range.startVerseNumber} إلى ${endSurah} ${range.endVerseNumber}`;
}

function getStudentMemorizedDeletionItems(student: Student) {
  const completedJuzItems = Array.from(new Set((student.completed_juzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30)))
    .sort((left, right) => left - right)
    .map((juzNumber) => {
      const bounds = getJuzBounds(juzNumber);
      return bounds ? {
        key: `juz-${juzNumber}`,
        label: `الجزء ${juzNumber}`,
        range: {
          startSurahNumber: bounds.startSurahNumber,
          startVerseNumber: bounds.startVerseNumber,
          endSurahNumber: bounds.endSurahNumber,
          endVerseNumber: bounds.endVerseNumber,
        },
      } : null;
    })
    .filter((item): item is { key: string; label: string; range: PreviousMemorizationRange } => Boolean(item));

  let partialRanges = normalizePreviousMemorizationRanges(student.memorized_ranges);
  if (partialRanges.length === 0 && student.memorized_start_surah && student.memorized_end_surah) {
    partialRanges = [{
      startSurahNumber: student.memorized_start_surah,
      startVerseNumber: student.memorized_start_verse || 1,
      endSurahNumber: student.memorized_end_surah,
      endVerseNumber: student.memorized_end_verse || SURAHS.find((surah) => surah.number === student.memorized_end_surah)?.verseCount || 1,
    }];
  }

  for (const item of completedJuzItems) {
    partialRanges = subtractMemorizedRangeFromRanges(partialRanges, item.range);
  }

  const partialItems = partialRanges.map((range, index) => ({
    key: `range-${index}-${range.startSurahNumber}-${range.startVerseNumber}-${range.endSurahNumber}-${range.endVerseNumber}`,
    label: formatMemorizedRangeLabel(range),
    range,
  }));

  return [...completedJuzItems, ...partialItems];
}

function rangesOverlap(left: PreviousMemorizationRange, right: PreviousMemorizationRange) {
  const leftStartsBeforeRightEnds = compareAyahRefs(
    left.startSurahNumber,
    left.startVerseNumber,
    right.endSurahNumber,
    right.endVerseNumber,
  ) <= 0;
  const rightStartsBeforeLeftEnds = compareAyahRefs(
    right.startSurahNumber,
    right.startVerseNumber,
    left.endSurahNumber,
    left.endVerseNumber,
  ) <= 0;

  return leftStartsBeforeRightEnds && rightStartsBeforeLeftEnds;
}

const MURAAJAA_OPTIONS = [
  { value: "20", label: "جزء واحد" },
  { value: "40", label: "جزئين" },
  { value: "60", label: "3 أجزاء" },
  { value: "weekly", label: "التقسيم على أسبوع" },
];

const RABT_OPTIONS = [
  { value: "10", label: "نصف جزء" },
  { value: "20", label: "جزء واحد" },
  { value: "40", label: "جزئين" },
];

const DAILY_OPTIONS = [
  { value: "0.25", label: "ربع وجه" },
  { value: "0.5", label: "نصف وجه" },
  { value: "1", label: "وجه واحد" },
  { value: "2", label: "وجهان" },
  { value: "3", label: "ثلاثة أوجه" },
];

function dailyLabel(v: number) {
  if (v === 0.25) return "ربع وجه";
  if (v === 0.5) return "نصف وجه";
  if (v === 1) return "وجه واحد";
  if (v === 2) return "وجهان";
  if (v === 3) return "ثلاثة أوجه";
  return `${v} وجه`;
}

function getPreferredEndSurah(
  options: typeof SURAHS,
  selectedStartSurah: number,
  preferredDirection: "asc" | "desc",
) {
  const optionNumbers = new Set(options.map((surah) => surah.number));
  const preferredCandidate = preferredDirection === "desc" ? selectedStartSurah - 1 : selectedStartSurah + 1;
  if (optionNumbers.has(preferredCandidate)) {
    return preferredCandidate;
  }

  const fallbackCandidate = preferredDirection === "desc" ? selectedStartSurah + 1 : selectedStartSurah - 1;
  if (optionNumbers.has(fallbackCandidate)) {
    return fallbackCandidate;
  }

  const nearest = options
    .filter((surah) => surah.number !== selectedStartSurah)
    .sort((left, right) => Math.abs(left.number - selectedStartSurah) - Math.abs(right.number - selectedStartSurah))[0];

  return nearest?.number ?? selectedStartSurah;
}

function getNextStartFromPrevious(
  prevStartSurahValue: string,
  prevEndSurahValue: string,
  prevEndVerseValue: string,
) {
  const previousStartNumber = parseInt(prevStartSurahValue, 10)
  const previousEndNumber = parseInt(prevEndSurahValue, 10)
  const previousEndVerseNumber = parseInt(prevEndVerseValue, 10)

  if (!previousStartNumber || !previousEndNumber || !previousEndVerseNumber) {
    return null
  }

  const previousEndSurah = SURAHS.find((surah) => surah.number === previousEndNumber)
  if (!previousEndSurah) return null

  const isDescending = previousStartNumber > previousEndNumber

  if (!isDescending) {
    if (previousEndVerseNumber < previousEndSurah.verseCount) {
      return {
        surahNumber: previousEndNumber,
        verseNumber: previousEndVerseNumber + 1,
      }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === previousEndNumber + 1)
    if (!nextSurah) return null

    return {
      surahNumber: nextSurah.number,
      verseNumber: 1,
    }
  }

  if (previousEndVerseNumber > 1) {
    return {
      surahNumber: previousEndNumber,
      verseNumber: previousEndVerseNumber - 1,
    }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === previousEndNumber - 1)
  if (!previousSurah) return null

  return {
    surahNumber: previousSurah.number,
    verseNumber: previousSurah.verseCount,
  }
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftVerseNumber: number,
  rightSurahNumber: number,
  rightVerseNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber;
  }

  return leftVerseNumber - rightVerseNumber;
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber);
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0;
}

function isAyahWithinRange(
  surahNumber: number,
  verseNumber: number,
  rangeStartSurahNumber: number,
  rangeStartVerseNumber: number,
  rangeEndSurahNumber: number,
  rangeEndVerseNumber: number,
) {
  const isAscendingRange = compareAyahRefs(
    rangeStartSurahNumber,
    rangeStartVerseNumber,
    rangeEndSurahNumber,
    rangeEndVerseNumber,
  ) <= 0;

  const normalizedRangeStart = isAscendingRange
    ? { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber }
    : { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber };
  const normalizedRangeEnd = isAscendingRange
    ? { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber }
    : { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber };

  return compareAyahRefs(surahNumber, verseNumber, normalizedRangeStart.surahNumber, normalizedRangeStart.verseNumber) >= 0
    && compareAyahRefs(surahNumber, verseNumber, normalizedRangeEnd.surahNumber, normalizedRangeEnd.verseNumber) <= 0;
}

function getAdjustedPreviewRange({
  startSurahNumber,
  startVerseNumber,
  endSurahNumber,
  endVerseNumber,
  dailyPages,
  direction,
  previousMemorizationRanges,
  prevStartSurah,
  prevStartVerse,
  prevEndSurah,
  prevEndVerse,
  completedJuzs,
}: {
  startSurahNumber: number;
  startVerseNumber: number;
  endSurahNumber: number;
  endVerseNumber: number;
  dailyPages?: number;
  direction: "asc" | "desc";
  previousMemorizationRanges?: PreviousMemorizationRange[];
  prevStartSurah?: string;
  prevStartVerse?: string;
  prevEndSurah?: string;
  prevEndVerse?: string;
  completedJuzs?: number[];
}) {
  return getAdjustedPlanPreviewRange({
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
    dailyPages,
    direction,
    previousMemorizationRanges,
    prevStartSurah: prevStartSurah ? parseInt(prevStartSurah, 10) : null,
    prevStartVerse: prevStartVerse ? parseInt(prevStartVerse, 10) : null,
    prevEndSurah: prevEndSurah ? parseInt(prevEndSurah, 10) : null,
    prevEndVerse: prevEndVerse ? parseInt(prevEndVerse, 10) : null,
    completedJuzs,
  });
}

function getLockedPreviousRanges(student: Student, plan: StudentPlan | null, completedDays: number) {
  const completedJuzRange = hasScatteredCompletedJuzs(student.completed_juzs)
    ? null
    : getContiguousCompletedJuzRange(student.completed_juzs);
  const memorizedStartSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_surah;
  const memorizedStartVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_verse;
  const memorizedEndSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_surah;
  const memorizedEndVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_verse;
  const storedRanges = normalizePreviousMemorizationRanges(student.memorized_ranges);

  if (plan && completedDays > 0) {
    return getPlanMemorizedRanges(
      {
        ...plan,
        has_previous: plan.has_previous || storedRanges.length > 0 || !!(plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber),
        prev_start_surah: plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber || null,
        prev_start_verse: plan.prev_start_verse || memorizedStartVerse || completedJuzRange?.startVerseNumber || null,
        prev_end_surah: plan.prev_end_surah || memorizedEndSurah || completedJuzRange?.endSurahNumber || null,
        prev_end_verse: plan.prev_end_verse || memorizedEndVerse || completedJuzRange?.endVerseNumber || null,
        previous_memorization_ranges: plan.previous_memorization_ranges || storedRanges,
      },
      completedDays,
    );
  }

  if (storedRanges.length > 0) {
    return storedRanges;
  }

  const startSurahNumber = memorizedStartSurah || plan?.prev_start_surah || completedJuzRange?.startSurahNumber || null;
  const startVerseNumber = memorizedStartVerse || plan?.prev_start_verse || completedJuzRange?.startVerseNumber || 1;
  const endSurahNumber = memorizedEndSurah || plan?.prev_end_surah || completedJuzRange?.endSurahNumber || null;
  const endSurah = endSurahNumber ? SURAHS.find((surah) => surah.number === endSurahNumber) : null;
  const endVerseNumber = memorizedEndVerse || plan?.prev_end_verse || completedJuzRange?.endVerseNumber || endSurah?.verseCount || 1;

  if (!startSurahNumber || !endSurahNumber) {
    if (!plan?.start_surah_number || !plan?.end_surah_number) {
      return [] as PreviousMemorizationRange[];
    }

    const planEndSurah = SURAHS.find((surah) => surah.number === plan.end_surah_number);

    return [{
      startSurahNumber: plan.start_surah_number,
      startVerseNumber: plan.start_verse || 1,
      endSurahNumber: plan.end_surah_number,
      endVerseNumber: plan.end_verse || planEndSurah?.verseCount || 1,
    }];
  }

  return [{
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
  }];
}

function getAyahRangeTotalPages(range: { startSurahNumber: number; startVerseNumber: number; endSurahNumber: number; endVerseNumber: number } | null) {
  if (!range) return 0;

  const startPage = getPageFloatForAyah(range.startSurahNumber, range.startVerseNumber);
  const nextAyah = getNextAyahReference(range.endSurahNumber, range.endVerseNumber);
  const endPageExclusive = nextAyah ? getPageFloatForAyah(nextAyah.surah, nextAyah.ayah) : 605;
  return Math.max(0, Math.round((endPageExclusive - startPage) * 10) / 10);
}

function getAyahRangesTotalPages(ranges: PreviousMemorizationRange[]) {
  return Math.round(ranges.reduce((total, range) => total + getAyahRangeTotalPages(range), 0) * 10) / 10;
}

function getActualMemorizedReviewRanges(student: Student | null, plan: StudentPlan | null, completedDays: number) {
  if (!student) return [] as PreviousMemorizationRange[];

  const completedJuzRange = hasScatteredCompletedJuzs(student.completed_juzs)
    ? null
    : getContiguousCompletedJuzRange(student.completed_juzs);
  const memorizedStartSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_surah;
  const memorizedStartVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_verse;
  const memorizedEndSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_surah;
  const memorizedEndVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_verse;
  const storedRanges = normalizePreviousMemorizationRanges(student.memorized_ranges);

  if (plan && completedDays > 0) {
    const memorizedRanges = getPlanMemorizedRanges(
      {
        ...plan,
        has_previous: plan.has_previous || storedRanges.length > 0 || !!(plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber),
        prev_start_surah: plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber || null,
        prev_start_verse: plan.prev_start_verse || memorizedStartVerse || completedJuzRange?.startVerseNumber || null,
        prev_end_surah: plan.prev_end_surah || memorizedEndSurah || completedJuzRange?.endSurahNumber || null,
        prev_end_verse: plan.prev_end_verse || memorizedEndVerse || completedJuzRange?.endVerseNumber || null,
        previous_memorization_ranges: plan.previous_memorization_ranges || storedRanges,
      },
      completedDays,
    );

    if (memorizedRanges.length > 0) {
      return memorizedRanges;
    }
  }

  if (!memorizedStartSurah && !memorizedEndSurah && !completedJuzRange) {
    return storedRanges;
  }

  const endSurahNumber = memorizedEndSurah || completedJuzRange?.endSurahNumber || null;
  const endSurah = endSurahNumber ? SURAHS.find((surah) => surah.number === endSurahNumber) : null;

  if (!endSurahNumber) {
    return [] as PreviousMemorizationRange[];
  }

  return [{
    startSurahNumber: memorizedStartSurah || completedJuzRange?.startSurahNumber || null,
    startVerseNumber: memorizedStartVerse || completedJuzRange?.startVerseNumber || 1,
    endSurahNumber,
    endVerseNumber: memorizedEndVerse || completedJuzRange?.endVerseNumber || endSurah?.verseCount || 1,
  }];
}

export default function StudentPlansPage() {
  const router = useRouter();
  const confirmDialog = useConfirmDialog()
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب")
  const [isCirclesLoading, setIsCirclesLoading] = useState(true);
  const [isCircleDataLoading, setIsCircleDataLoading] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPlans, setStudentPlans] = useState<
    Record<string, StudentPlan | null>
  >({});
  const [studentProgress, setStudentProgress] = useState<
    Record<string, number>
  >({});
  const [studentCompletedDays, setStudentCompletedDays] = useState<
    Record<string, number>
  >({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDialogStudents, setResetDialogStudents] = useState<Student[]>([]);
  const [resetDialogCircle, setResetDialogCircle] = useState<string | null>(null);
  const [isResetDialogLoading, setIsResetDialogLoading] = useState(false);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);
  const [memorizationEditorStudentId, setMemorizationEditorStudentId] = useState<string | null>(null);
  const [memorizationActionMsg, setMemorizationActionMsg] = useState<{ studentId: string; type: "success" | "error"; text: string } | null>(null);

  // نافذة إضافة الخطة
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [startSurah, setStartSurah] = useState<string>("");
  const [endSurah, setEndSurah] = useState<string>("");
  const [dailyPages, setDailyPages] = useState<string>("1");
  const [customDays, setCustomDays] = useState<string>("");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startVerse, setStartVerse] = useState<string>("");
  const [endVerse, setEndVerse] = useState<string>("");

  // الحفظ السابق
  const [hasPrevious, setHasPrevious] = useState(false);
  const [previousRanges, setPreviousRanges] = useState<PreviousRangeDraft[]>([createPreviousRangeDraft()]);
  const [removingPreviousRangeIds, setRemovingPreviousRangeIds] = useState<string[]>([]);
  const [muraajaaPages, setMuraajaaPages] = useState<string>("20");
  const [muraajaaMode, setMuraajaaMode] = useState<ReviewMode>("daily_fixed");
  const [rabtPages, setRabtPages] = useState<string>("10");
  const [weeklyReviewDialogOpen, setWeeklyReviewDialogOpen] = useState(false);
  const [weeklyReviewMinDailyPages, setWeeklyReviewMinDailyPages] = useState<string>("10");
  const [weeklyReviewStartDay, setWeeklyReviewStartDay] = useState<string>("0");
  const [weeklyReviewEndDay, setWeeklyReviewEndDay] = useState<string>("4");
  const [draftWeeklyReviewMinDailyPages, setDraftWeeklyReviewMinDailyPages] = useState<string>("10");
  const [draftWeeklyReviewStartDay, setDraftWeeklyReviewStartDay] = useState<string>("0");
  const [draftWeeklyReviewEndDay, setDraftWeeklyReviewEndDay] = useState<string>("4");
  const [isPreviousLocked, setIsPreviousLocked] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // جلب الحلقات
  useEffect(() => {
    if (authLoading || !authVerified) return;
    setIsCirclesLoading(true);
    fetch("/api/circles")
      .then((r) => r.json())
      .then((d) => setCircles(d.circles || []))
      .catch(console.error)
      .finally(() => setIsCirclesLoading(false));
  }, [authLoading, authVerified]);

  // جلب طلاب الحلقة المختارة
  useEffect(() => {
    if (!selectedCircle) {
      setStudents([]);
      setStudentPlans({});
      setStudentProgress({});
      setStudentCompletedDays({});
      setIsCircleDataLoading(false);
      return;
    }

    let isCancelled = false;

    const loadCircleData = async () => {
      setIsCircleDataLoading(true);
      setStudents([]);
      setStudentPlans({});
      setStudentProgress({});
      setStudentCompletedDays({});

      try {
        const response = await fetch("/api/students");
        const data = await response.json();
        const circleStudents = (data.students || []).filter(
          (s: Student) => (s.halaqah || "").trim() === selectedCircle.trim(),
        );

        if (isCancelled) return;

        setStudents(circleStudents);

        const { plans, progress, completedDays } = await fetchPlansForStudents(circleStudents);
        if (isCancelled) return;

        setStudentPlans(plans);
        setStudentProgress(progress);
        setStudentCompletedDays(completedDays);
      } catch (error) {
        if (isCancelled) return;
        console.error(error);
        setStudents([]);
        setStudentPlans({});
        setStudentProgress({});
        setStudentCompletedDays({});
      } finally {
        if (!isCancelled) {
          setIsCircleDataLoading(false);
        }
      }
    };

    loadCircleData();

    return () => {
      isCancelled = true;
    };
  }, [selectedCircle]);

  const fetchPlansForStudents = async (studs: Student[]) => {
    const plans: Record<string, StudentPlan | null> = {};
    const progress: Record<string, number> = {};
    const completedDays: Record<string, number> = {};

    if (studs.length === 0) {
      return { plans, progress, completedDays };
    }

    try {
      const ids = studs.map((student) => student.id).join(",");
      const res = await fetch(`/api/student-plans?student_ids=${encodeURIComponent(ids)}`, { cache: "no-store" });
      const data = await res.json();
      const plansByStudent = data.plansByStudent || {};

      for (const student of studs) {
        const summary = plansByStudent[student.id] || {};
        plans[student.id] = summary.plan || null;
        progress[student.id] = summary.progressPercent || 0;
        completedDays[student.id] = summary.completedDays || 0;
      }
    } catch {
      for (const student of studs) {
        plans[student.id] = null;
        progress[student.id] = 0;
        completedDays[student.id] = 0;
      }
    }

    return { plans, progress, completedDays };
  };

  const openAddDialog = (student: Student) => {
    const currentPlan = studentPlans[student.id];

    if (currentPlan) {
      const editablePreviousRanges = getEditablePlanPreviousRanges(currentPlan);

      setSelectedStudent(student);
      setStartSurah(String(currentPlan.start_surah_number));
      setEndSurah(String(currentPlan.end_surah_number));
      setDailyPages(String(currentPlan.daily_pages || 1));
      setCustomDays(currentPlan.total_days ? String(currentPlan.total_days) : "");
      setSaveMsg(null);
      setStartOpen(false);
      setEndOpen(false);
      setStartVerse(currentPlan.start_verse ? String(currentPlan.start_verse) : "");
      setEndVerse(currentPlan.end_verse ? String(currentPlan.end_verse) : "");
      setHasPrevious(Boolean(currentPlan.has_previous || editablePreviousRanges.length > 0));
      setIsPreviousLocked(false);
      setPreviousRanges(buildPreviousRangeDrafts(editablePreviousRanges));
      setRemovingPreviousRangeIds([]);
      setMuraajaaPages(String(currentPlan.muraajaa_pages ?? 20));
      setMuraajaaMode(currentPlan.muraajaa_mode === "weekly_distributed" ? "weekly_distributed" : "daily_fixed");
      setRabtPages(String(currentPlan.rabt_pages ?? 10));
      setWeeklyReviewMinDailyPages(String(currentPlan.weekly_muraajaa_min_daily_pages ?? 10));
      setWeeklyReviewStartDay(String(currentPlan.weekly_muraajaa_start_day ?? 0));
      setWeeklyReviewEndDay(String(currentPlan.weekly_muraajaa_end_day ?? 4));
      setDraftWeeklyReviewMinDailyPages(String(currentPlan.weekly_muraajaa_min_daily_pages ?? 10));
      setDraftWeeklyReviewStartDay(String(currentPlan.weekly_muraajaa_start_day ?? 0));
      setDraftWeeklyReviewEndDay(String(currentPlan.weekly_muraajaa_end_day ?? 4));
      setWeeklyReviewDialogOpen(false);
      setAddDialogOpen(true);
      return;
    }

    const lockedPreviousRanges = getLockedPreviousRanges(student, currentPlan, studentCompletedDays[student.id] || 0);
    const normalizedLockedPreviousRanges = normalizePreviousMemorizationRanges(lockedPreviousRanges);
    const lockedPreviousBoundary = lockedPreviousRanges.length === 1
      ? lockedPreviousRanges[0]
      : getPreviousMemorizationBoundary(normalizedLockedPreviousRanges);
    const hasLockedPrevious = lockedPreviousRanges.length > 0;
    const shouldLockPrevious = !!currentPlan || hasLockedPrevious;
    const nextPlanStart = lockedPreviousBoundary && lockedPreviousRanges.length === 1
      ? getNextStartFromPrevious(
          String(lockedPreviousBoundary.startSurahNumber),
          String(lockedPreviousBoundary.endSurahNumber),
          String(lockedPreviousBoundary.endVerseNumber),
        )
      : null;

    setSelectedStudent(student);
    setStartSurah(nextPlanStart ? String(nextPlanStart.surahNumber) : "");
    setEndSurah("");
    setDailyPages("1");
    setCustomDays("");
    setSaveMsg(null);
    setStartOpen(false);
    setEndOpen(false);
    setStartVerse(nextPlanStart ? String(nextPlanStart.verseNumber) : "");
    setEndVerse("");

    setHasPrevious(shouldLockPrevious);
    setIsPreviousLocked(shouldLockPrevious);
    setPreviousRanges(buildPreviousRangeDrafts(lockedPreviousRanges));
    setRemovingPreviousRangeIds([]);
    setMuraajaaPages("20");
    setMuraajaaMode("daily_fixed");
    setRabtPages("10");
    setWeeklyReviewMinDailyPages("10");
    setWeeklyReviewStartDay("0");
    setWeeklyReviewEndDay("4");
    setDraftWeeklyReviewMinDailyPages("10");
    setDraftWeeklyReviewStartDay("0");
    setDraftWeeklyReviewEndDay("4");
    setWeeklyReviewDialogOpen(false);

    setAddDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!selectedStudent || !startSurah || !endSurah || !dailyPages) {
      setSaveMsg({ type: "error", text: "يرجى تعبئة جميع الحقول" });
      return;
    }
    const startNum = parseInt(startSurah);
    const endNum = parseInt(endSurah);

    if (hasPrevious) {
      if (normalizedPreviousRanges.length === 0 || hasIncompletePreviousRanges) {
        setSaveMsg({ type: "error", text: "يجب تعبئة بيانات الحفظ السابق كاملة" });
        return;
      }

      const overlappingPreviousRanges = normalizedPreviousRanges.some((range, index) => (
        normalizedPreviousRanges.slice(index + 1).some((otherRange) => rangesOverlap(range, otherRange))
      ));
      if (overlappingPreviousRanges) {
        setSaveMsg({ type: "error", text: "لا يمكن تكرار أو تداخل المحفوظ السابق بين البطاقات" });
        return;
      }

    }

    if (startNum === endNum && startVerse && endVerse && parseInt(startVerse) > parseInt(endVerse)) {
      setSaveMsg({ type: "error", text: "في نفس السورة يجب أن تكون آية النهاية بعد آية البداية" });
      return;
    }

    const startSurahData = SURAHS.find((s) => s.number === startNum)!;
    const endSurahData = SURAHS.find((s) => s.number === endNum)!;
    const adjustedPreview = getAdjustedPreviewRange({
      startSurahNumber: startNum,
      startVerseNumber: startVerse ? parseInt(startVerse) : 1,
      endSurahNumber: endNum,
      endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === endNum)?.verseCount || 1),
      dailyPages: parseFloat(dailyPages),
      direction,
      previousMemorizationRanges: normalizedPreviousRanges,
      prevStartSurah,
      prevStartVerse,
      prevEndSurah,
      prevEndVerse,
      completedJuzs: selectedStudent?.completed_juzs,
    });
    const total = adjustedPreview.totalPages;
    const days = adjustedPreview.totalDays;
    const effectiveDays = days;
    const effectiveWeeklyReviewPlan = muraajaaMode === "weekly_distributed"
      ? buildWeeklyReviewPlan({
          totalPages: automaticWeeklyReviewSourcePages,
          minDailyPages: Number(weeklyReviewMinDailyPages),
          startDay: Number(weeklyReviewStartDay),
          endDay: Number(weeklyReviewEndDay),
        })
      : null;

    setIsSaving(true);
    try {
      const res = await fetch("/api/student-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          start_surah_number: startNum,
          start_surah_name: startSurahData.name,
          start_verse: startVerse ? parseInt(startVerse) : null,
          end_surah_number: endNum,
          end_surah_name: endSurahData.name,
          end_verse: endVerse ? parseInt(endVerse) : null,
          daily_pages: parseFloat(dailyPages),
          total_days: effectiveDays,
          direction,
          has_previous: hasPrevious,
          previous_memorization_ranges: hasPrevious ? normalizedPreviousRanges : [],
          prev_start_surah:
            hasPrevious && prevStartSurah ? parseInt(prevStartSurah) : null,
          prev_start_verse:
            hasPrevious && prevStartVerse ? parseInt(prevStartVerse) : null,
          prev_end_surah:
            hasPrevious && prevEndSurah ? parseInt(prevEndSurah) : null,
          prev_end_verse:
            hasPrevious && prevEndVerse ? parseInt(prevEndVerse) : null,
          muraajaa_pages: muraajaaMode === "weekly_distributed"
            ? effectiveWeeklyReviewPlan?.dailyTargetPages ?? null
            : parseFloat(muraajaaPages),
          rabt_pages: parseFloat(rabtPages),
          muraajaa_mode: muraajaaMode,
          weekly_muraajaa_total_pages: muraajaaMode === "weekly_distributed" ? automaticWeeklyReviewSourcePages : null,
          weekly_muraajaa_min_daily_pages: muraajaaMode === "weekly_distributed" ? parseFloat(weeklyReviewMinDailyPages) : null,
          weekly_muraajaa_start_day: muraajaaMode === "weekly_distributed" ? parseInt(weeklyReviewStartDay, 10) : null,
          weekly_muraajaa_end_day: muraajaaMode === "weekly_distributed" ? parseInt(weeklyReviewEndDay, 10) : null,
          start_date: null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const refreshedRes = await fetch(`/api/student-plans?student_id=${selectedStudent.id}`, { cache: "no-store" });
        const refreshedData = await refreshedRes.json();
        // تحديث الخطة في القائمة
        setStudentPlans((prev) => ({
          ...prev,
          [selectedStudent.id]: refreshedData.plan || data.plan,
        }));
        setStudentProgress((prev) => ({ ...prev, [selectedStudent.id]: refreshedData.progressPercent || 0 }));
        setStudentCompletedDays((prev) => ({ ...prev, [selectedStudent.id]: refreshedData.completedDays || 0 }));
        setSaveMsg(null);
        setAddDialogOpen(false);
      } else {
        setSaveMsg({ type: "error", text: data.error || "فشل في حفظ الخطة" });
      }
    } catch {
      setSaveMsg({ type: "error", text: "حدث خطأ، يرجى المحاولة مجدداً" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetMemorization = async (student: Student) => {
    const confirmed = await confirmDialog({
      title: "إعادة حفظ الطالب",
      description: "سيتم حذف الخطة الحالية إن وجدت ومسح المحفوظ السابق لهذا الطالب للبدء من الصفر. هل تريد المتابعة؟",
      confirmText: "إعادة الحفظ",
      cancelText: "إلغاء",
    });
    if (!confirmed) return;

    try {
      setResettingStudentId(student.id);
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, reset_memorized: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في إعادة حفظ الطالب");
      }

      setStudents((prev) => prev.map((item) => (
        item.id === student.id
          ? {
              ...item,
              completed_juzs: [],
              current_juzs: [],
              memorized_start_surah: null,
              memorized_start_verse: null,
              memorized_end_surah: null,
              memorized_end_verse: null,
              memorized_ranges: null,
            }
          : item
      )));
      setStudentPlans((prev) => ({ ...prev, [student.id]: null }));
      setStudentProgress((prev) => ({ ...prev, [student.id]: 0 }));
      setStudentCompletedDays((prev) => ({ ...prev, [student.id]: 0 }));
      setResetDialogStudents((prev) => prev.map((item) => (
        item.id === student.id
          ? {
              ...item,
              completed_juzs: [],
              current_juzs: [],
              memorized_start_surah: null,
              memorized_start_verse: null,
              memorized_end_surah: null,
              memorized_end_verse: null,
              memorized_ranges: null,
            }
          : item
      )));
      setMemorizationEditorStudentId((currentId) => currentId === student.id ? null : currentId);
      setMemorizationActionMsg((currentMsg) => currentMsg?.studentId === student.id ? null : currentMsg);
    } catch (error) {
      console.error(error);
    } finally {
      setResettingStudentId(null);
    }
  };

  const syncStudentPlanState = async (studentId: string) => {
    try {
      const res = await fetch(`/api/student-plans?student_id=${studentId}`);
      const data = await res.json();
      setStudentPlans((prev) => ({ ...prev, [studentId]: data.plan || null }));
      setStudentProgress((prev) => ({ ...prev, [studentId]: data.progressPercent || 0 }));
      setStudentCompletedDays((prev) => ({ ...prev, [studentId]: data.completedDays || 0 }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMemorizedPortion = async (student: Student, range: PreviousMemorizationRange) => {

    const confirmed = await confirmDialog({
      title: "حذف جزء من المحفوظ",
      description: `سيتم حذف: ${formatMemorizedRangeLabel(range)} من محفوظ الطالب الحالي.`,
      confirmText: "حذف الجزء",
      cancelText: "إلغاء",
    });
    if (!confirmed) return;

    try {
      setResettingStudentId(student.id);
      setMemorizationActionMsg(null);
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          remove_memorized_range: range,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMemorizationActionMsg({ studentId: student.id, type: "error", text: data.error || "فشل في حذف الجزء المحدد" });
        return;
      }

      const updatedStudent = {
        ...student,
        ...data.student,
      };

      setStudents((prev) => prev.map((item) => item.id === student.id ? updatedStudent : item));
      setResetDialogStudents((prev) => prev.map((item) => item.id === student.id ? updatedStudent : item));
      await syncStudentPlanState(student.id);
      setMemorizationActionMsg({ studentId: student.id, type: "success", text: "تم تحديث محفوظ الطالب بنجاح" });
    } catch (error) {
      console.error(error);
      setMemorizationActionMsg({ studentId: student.id, type: "error", text: "حدث خطأ أثناء حذف الجزء المحدد" });
    } finally {
      setResettingStudentId(null);
    }
  };

  const openResetDialog = async () => {
    if (!selectedCircle) {
      return;
    }

    setResetDialogOpen(true);
    setResetDialogCircle(selectedCircle);
    setResetDialogStudents(students);
    setIsResetDialogLoading(false);
  };

  // السور مرتبة تنازلياً (من الناس إلى البقرة)
  const startNum = startSurah ? parseInt(startSurah) : null;
  const endNum = endSurah ? parseInt(endSurah) : null;
  const direction = (startNum && endNum && startNum > endNum) ? "desc" : "asc";
  const isEditingPlan = !!(selectedStudent && studentPlans[selectedStudent.id]);
  const rawPreviousRanges = hasPrevious
    ? getDraftPreviousRanges(previousRanges)
    : [];
  const normalizedPreviousRanges = hasPrevious
    ? normalizePreviousMemorizationRanges(rawPreviousRanges)
    : [];
  const previousRangesBoundary = rawPreviousRanges.length === 1
    ? rawPreviousRanges[0]
    : getPreviousMemorizationBoundary(normalizedPreviousRanges);
  const prevStartSurah = previousRangesBoundary ? String(previousRangesBoundary.startSurahNumber) : "";
  const prevStartVerse = previousRangesBoundary ? String(previousRangesBoundary.startVerseNumber) : "";
  const prevEndSurah = previousRangesBoundary ? String(previousRangesBoundary.endSurahNumber) : "";
  const prevEndVerse = previousRangesBoundary ? String(previousRangesBoundary.endVerseNumber) : "";
  const hasIncompletePreviousRanges = hasPrevious && previousRanges.some((range) => {
    const hasAnyValue = Boolean(range.startSurah || range.startVerse || range.endSurah || range.endVerse);
    const isComplete = Boolean(range.startSurah && range.endSurah && range.endVerse);
    return hasAnyValue && !isComplete;
  });
  const nextStartFromPrevious = rawPreviousRanges.length === 1
    ? getNextStartFromPrevious(
        String(rawPreviousRanges[0].startSurahNumber),
        String(rawPreviousRanges[0].endSurahNumber),
        String(rawPreviousRanges[0].endVerseNumber),
      )
    : null;
  const pendingMasteryJuzs = getPendingMasteryJuzs(selectedStudent?.current_juzs, selectedStudent?.completed_juzs);
  const masteryJuzLabel = formatJuzList(pendingMasteryJuzs);
  const hasStoredPreviousMemorization = Boolean(
    (selectedStudent?.completed_juzs?.length || 0) > 0 ||
    (selectedStudent?.memorized_start_surah && selectedStudent?.memorized_end_surah) ||
    (selectedStudent?.memorized_ranges?.length || 0) > 0,
  );
  const shouldHidePreviousToggle = hasStoredPreviousMemorization && !isEditingPlan;
  const isMasteryOnlyStudent = pendingMasteryJuzs.length > 0 && !hasStoredPreviousMemorization;
  const completedJuzSet = new Set(selectedStudent?.completed_juzs || []);
  const completedJuzBounds = (selectedStudent?.completed_juzs || [])
    .map((juzNumber) => getJuzBounds(juzNumber))
    .filter((bounds): bounds is NonNullable<ReturnType<typeof getJuzBounds>> => Boolean(bounds));
  const isAyahBlockedByCompletedJuzs = (surahNumber: number, verseNumber: number) => {
    if (completedJuzBounds.length === 0) return false;

    return completedJuzBounds.some((bounds) => (
      compareAyahRefs(surahNumber, verseNumber, bounds.startSurahNumber, bounds.startVerseNumber) >= 0
      && compareAyahRefs(surahNumber, verseNumber, bounds.endSurahNumber, bounds.endVerseNumber) <= 0
    ));
  };
  const isAyahBlockedByPreviousRanges = (surahNumber: number, verseNumber: number) => {
    if (!hasPrevious || normalizedPreviousRanges.length === 0) return false;

    return normalizedPreviousRanges.some((range) => (
      isAyahWithinRange(
        surahNumber,
        verseNumber,
        range.startSurahNumber,
        range.startVerseNumber,
        range.endSurahNumber,
        range.endVerseNumber,
      )
    ));
  };
  const getAvailableVerseNumbers = (surahNumber: number, minVerse: number, maxVerse: number) => {
    if (maxVerse < minVerse) return [];

    return Array.from({ length: maxVerse - minVerse + 1 }, (_, index) => minVerse + index)
    .filter((verseNumber) => (
      !isAyahBlockedByCompletedJuzs(surahNumber, verseNumber)
      && !isAyahBlockedByPreviousRanges(surahNumber, verseNumber)
    ));
  };
  const isSurahBlockedByCompletedJuzs = (surahNumber: number, minVerse = 1, maxVerse?: number) => {
    const surah = SURAHS.find((item) => item.number === surahNumber);
    if (!surah) return true;

    const safeMaxVerse = Math.min(maxVerse ?? surah.verseCount, surah.verseCount);
    return getAvailableVerseNumbers(surahNumber, Math.max(1, minVerse), safeMaxVerse).length === 0;
  };

  // خيارات بداية الخطة
  const startSurahOptions = (() => {
    let opts = SURAHS; // إظهار كل السور في البداية
    opts = opts.filter((surah) => {
      if (startSurah && surah.number === parseInt(startSurah, 10)) return true;
      return !isSurahBlockedByCompletedJuzs(surah.number, 1, surah.verseCount);
    });
    return opts;
  })();

  const startVerseOptions = (() => {
    if (!startSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(startSurah));
    if (!selectedSurah) return [];

    return getAvailableVerseNumbers(selectedSurah.number, 1, selectedSurah.verseCount);
  })();

  const getPreviousRangeStartVerseOptions = (range: PreviousRangeDraft) => {
    if (!range.startSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(range.startSurah, 10));
    if (!selectedSurah) return [];

    const otherRanges = normalizePreviousMemorizationRanges(getDraftPreviousRanges(previousRanges.filter((item) => item.id !== range.id)));

    return Array.from({ length: selectedSurah.verseCount }, (_, index) => index + 1)
      .filter((verseNumber) => !otherRanges.some((otherRange) => (
        isAyahWithinRange(
          selectedSurah.number,
          verseNumber,
          otherRange.startSurahNumber,
          otherRange.startVerseNumber,
          otherRange.endSurahNumber,
          otherRange.endVerseNumber,
        )
      )));
  };

  const getPreviousRangeEndVerseOptions = (range: PreviousRangeDraft) => {
    if (!range.endSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(range.endSurah, 10));
    if (!selectedSurah) return [];

    const otherRanges = normalizePreviousMemorizationRanges(getDraftPreviousRanges(previousRanges.filter((item) => item.id !== range.id)));

    let minVerse = 1;
    const maxVerse = selectedSurah.verseCount;

    if (range.startSurah && range.startVerse && range.startSurah === range.endSurah) {
      minVerse = parseInt(range.startVerse, 10);
    }

    return Array.from({ length: Math.max(0, maxVerse - minVerse + 1) }, (_, index) => minVerse + index)
      .filter((verseNumber) => !otherRanges.some((otherRange) => (
        isAyahWithinRange(
          selectedSurah.number,
          verseNumber,
          otherRange.startSurahNumber,
          otherRange.startVerseNumber,
          otherRange.endSurahNumber,
          otherRange.endVerseNumber,
        )
      )));
  };

  const getPreviousRangeSurahOptions = (range: PreviousRangeDraft, type: "start" | "end") => {
    return SURAHS.filter((surah) => {
      const currentValue = type === "start" ? range.startSurah : range.endSurah;
      if (currentValue === String(surah.number)) return true;

      const verseOptions = type === "start"
        ? getPreviousRangeStartVerseOptions({ ...range, startSurah: String(surah.number) })
        : getPreviousRangeEndVerseOptions({ ...range, endSurah: String(surah.number) });

      return verseOptions.length > 0;
    });
  };

  const updatePreviousRange = (rangeId: string, updates: Partial<PreviousRangeDraft>) => {
    setPreviousRanges((currentRanges) => currentRanges.map((range) => (
      range.id === rangeId ? { ...range, ...updates } : range
    )));
  };

  const addPreviousRange = () => {
    setPreviousRanges((currentRanges) => [...currentRanges, createPreviousRangeDraft()]);
  };

  const removePreviousRange = (rangeId: string) => {
    setRemovingPreviousRangeIds((currentIds) => currentIds.includes(rangeId) ? currentIds : [...currentIds, rangeId]);

    window.setTimeout(() => {
      setPreviousRanges((currentRanges) => {
        const nextRanges = currentRanges.filter((range) => range.id !== rangeId);
        return nextRanges.length > 0 ? nextRanges : [createPreviousRangeDraft()];
      });
      setRemovingPreviousRangeIds((currentIds) => currentIds.filter((id) => id !== rangeId));
    }, 180);
  };

  const shouldKeepPlanDialogOpen = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
      target.closest("[data-slot='select-content']") ||
      target.closest("[data-slot='popover-content']") ||
      target.closest("[data-radix-popper-content-wrapper]"),
    );
  };

  const handlePlanDialogOutsideInteraction = (event: Event) => {
    if (shouldKeepPlanDialogOpen(event.target)) {
      event.preventDefault();
    }
  };

  // قائمة السور المتاحة لنهاية الخطة
  const endSurahOptions = (() => {
    if (!startNum) return startSurahOptions;

    return startSurahOptions
      .filter((surah) => {
        if (endSurah && surah.number === parseInt(endSurah, 10)) return true;

        const minVerse = startNum && surah.number === startNum && startVerse
          ? parseInt(startVerse, 10)
          : 1;

        return !isSurahBlockedByCompletedJuzs(surah.number, minVerse);
      })
      .slice()
      .sort((left, right) => left.number - right.number);
  })();

  const endVerseOptions = (() => {
    if (!endSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(endSurah));
    if (!selectedSurah) return [];

    let minVerse = 1;
    let maxVerse = selectedSurah.verseCount;

    if (startNum && endNum && startNum === endNum && startVerse) {
      minVerse = parseInt(startVerse, 10);
    }

    return getAvailableVerseNumbers(selectedSurah.number, minVerse, maxVerse);
  })();

  // إعادة تعيين النهاية إذا أصبحت غير صالحة
  const isEndValid =
    endNum !== null && endSurahOptions.some((s) => s.number === endNum);
  const previewTotal =
    startSurah && endSurah && isEndValid
      ? getAdjustedPreviewRange({
          startSurahNumber: parseInt(startSurah),
          startVerseNumber: startVerse ? parseInt(startVerse) : 1,
          endSurahNumber: parseInt(endSurah),
          endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === parseInt(endSurah))?.verseCount || 1),
          dailyPages: parseFloat(dailyPages),
          direction,
          previousMemorizationRanges: normalizedPreviousRanges,
          prevStartSurah,
          prevStartVerse,
          prevEndSurah,
          prevEndVerse,
          completedJuzs: selectedStudent?.completed_juzs,
        }).totalPages
      : 0;
  const formattedPreviewTotal = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(previewTotal);
  const manualWeeklyReviewSourceRanges = normalizedPreviousRanges;
  const automaticWeeklyReviewSourceRanges = selectedStudent
    ? getActualMemorizedReviewRanges(selectedStudent, studentPlans[selectedStudent.id] || null, studentCompletedDays[selectedStudent.id] || 0)
    : manualWeeklyReviewSourceRanges;
  const automaticWeeklyReviewSourcePages = getAyahRangesTotalPages(
    automaticWeeklyReviewSourceRanges.length > 0 ? automaticWeeklyReviewSourceRanges : manualWeeklyReviewSourceRanges,
  );
  const savedWeeklyReviewPlan = muraajaaMode === "weekly_distributed"
    ? buildWeeklyReviewPlan({
        totalPages: automaticWeeklyReviewSourcePages,
        minDailyPages: Number(weeklyReviewMinDailyPages),
        startDay: Number(weeklyReviewStartDay),
        endDay: Number(weeklyReviewEndDay),
      })
    : null;
  const draftWeeklyReviewPlan = buildWeeklyReviewPlan({
    totalPages: automaticWeeklyReviewSourcePages,
    minDailyPages: Number(draftWeeklyReviewMinDailyPages),
    startDay: Number(draftWeeklyReviewStartDay),
    endDay: Number(draftWeeklyReviewEndDay),
  });

  const openWeeklyReviewDialog = () => {
    setDraftWeeklyReviewMinDailyPages(weeklyReviewMinDailyPages);
    setDraftWeeklyReviewStartDay(weeklyReviewStartDay);
    setDraftWeeklyReviewEndDay(weeklyReviewEndDay);
    setWeeklyReviewDialogOpen(true);
  };

  const handleMuraajaaChange = (value: string) => {
    if (value === "weekly") {
      openWeeklyReviewDialog();
      return;
    }

    setMuraajaaMode("daily_fixed");
    setMuraajaaPages(value);
  };

  const handleSaveWeeklyReviewConfig = () => {
    setWeeklyReviewMinDailyPages(draftWeeklyReviewMinDailyPages);
    setWeeklyReviewStartDay(draftWeeklyReviewStartDay);
    setWeeklyReviewEndDay(draftWeeklyReviewEndDay);
    setMuraajaaMode("weekly_distributed");
    setWeeklyReviewDialogOpen(false);
  };
  const previewDays =
    startSurah && endSurah && isEndValid
      ? getAdjustedPreviewRange({
          startSurahNumber: parseInt(startSurah),
          startVerseNumber: startVerse ? parseInt(startVerse) : 1,
          endSurahNumber: parseInt(endSurah),
          endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === parseInt(endSurah))?.verseCount || 1),
          dailyPages: parseFloat(dailyPages),
          direction,
          previousMemorizationRanges: normalizedPreviousRanges,
          prevStartSurah,
          prevStartVerse,
          prevEndSurah,
          prevEndVerse,
          completedJuzs: selectedStudent?.completed_juzs,
        }).totalDays
      : 0;

  useEffect(() => {
    if (isEditingPlan || !hasPrevious || normalizedPreviousRanges.length !== 1 || !nextStartFromPrevious) {
      return;
    }

    if (startSurah || startVerse) {
      return;
    }

    setStartSurah(String(nextStartFromPrevious.surahNumber));
    setStartVerse(String(nextStartFromPrevious.verseNumber));
  }, [hasPrevious, isEditingPlan, normalizedPreviousRanges.length, nextStartFromPrevious, startSurah, startVerse]);

  useEffect(() => {
    if (startOpen && startSurah) {
      setTimeout(() => {
        document
          .getElementById(`start-surah-${startSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [startOpen, startSurah]);

  useEffect(() => {
    if (endOpen && endSurah) {
      setTimeout(() => {
        document
          .getElementById(`end-surah-${endSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [endOpen, endSurah]);

  useEffect(() => {
    if (!startNum) return;

    const preferredDirection = hasPrevious && prevStartSurah && prevEndSurah && parseInt(prevStartSurah, 10) > parseInt(prevEndSurah, 10)
      ? "desc"
      : "asc";

    const autoEndSurah = String(getPreferredEndSurah(startSurahOptions, startNum, preferredDirection));
    if (!endSurah || !endSurahOptions.some((surah) => surah.number === parseInt(endSurah, 10))) {
      setEndSurah(autoEndSurah);
    }
  }, [endSurah, endSurahOptions, hasPrevious, prevEndSurah, prevStartSurah, startNum, startSurahOptions]);

  useEffect(() => {
    if (!startVerseOptions.length) {
      if (startVerse) setStartVerse("");
      return;
    }

    if (!startVerse || !startVerseOptions.includes(parseInt(startVerse, 10))) {
      setStartVerse(String(startVerseOptions[0]));
    }
  }, [hasPrevious, nextStartFromPrevious, startNum, startVerse, startVerseOptions]);

  useEffect(() => {
    if (!endVerseOptions.length) {
      if (endVerse) setEndVerse("");
      return;
    }

    if (!endVerse || !endVerseOptions.includes(parseInt(endVerse, 10))) {
      setEndVerse(String(endVerseOptions[endVerseOptions.length - 1]));
    }
  }, [endVerse, endVerseOptions]);

  useEffect(() => {
    setPreviousRanges((currentRanges) => {
      let hasChanges = false;
      const nextRanges = currentRanges.map((range) => {
        const startVerseOptions = getPreviousRangeStartVerseOptions(range);
        const endVerseOptions = getPreviousRangeEndVerseOptions(range);
        const nextStartVerse = startVerseOptions.length > 0
          ? (range.startVerse && startVerseOptions.includes(parseInt(range.startVerse, 10)) ? range.startVerse : String(startVerseOptions[0]))
          : "";
        const nextEndVerse = endVerseOptions.length > 0
          ? (range.endVerse && endVerseOptions.includes(parseInt(range.endVerse, 10)) ? range.endVerse : String(endVerseOptions[endVerseOptions.length - 1]))
          : "";

        if (nextStartVerse === range.startVerse && nextEndVerse === range.endVerse) {
          return range;
        }

        hasChanges = true;
        return {
          ...range,
          startVerse: nextStartVerse,
          endVerse: nextEndVerse,
        };
      });

      return hasChanges ? nextRanges : currentRanges;
    });
  }, [previousRanges]);

  if (authLoading || !authVerified) {
    return <SiteLoader fullScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* رأس الصفحة */}
          <div className="flex items-center justify-between gap-4 border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-[#3453a7]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1a2332]">خطط الطلاب</h1>
              </div>
            </div>

            {selectedCircle && !isCircleDataLoading && students.length > 0 && (
              <button
                onClick={openResetDialog}
                className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
              >
                إعادة حفظ طالب
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#3453a7]/20">
              {isCirclesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <SiteLoader size="md" />
                </div>
              ) : circles.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-neutral-400">
                  لا توجد حلقات
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedCircle ?? ""}
                    onValueChange={(value) => setSelectedCircle(value || null)}
                  >
                    <SelectTrigger className="w-full h-12 flex-row-reverse text-sm text-right">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.id} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

              {!selectedCircle ? (
                <div className="py-6" />
              ) : isCircleDataLoading ? (
                <div className="flex justify-center py-16">
                  <SiteLoader size="lg" />
                </div>
              ) : students.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-neutral-400">
                  لا يوجد طلاب في هذه الحلقة
                </div>
              ) : (
                <div className="divide-y divide-[#3453a7]/15">
                  {students.map((student) => {
                    const plan = studentPlans[student.id];
                    const progress = studentProgress[student.id] || 0;
                    const hasStoredMemorized = getStudentMemorizedDeletionItems(student).length > 0;
                    return (
                      <div
                        key={student.id}
                        className="px-6 py-4 flex items-center gap-4"
                      >
                        {/* معلومات الطالب */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-[#1a2332] text-sm">
                              {student.name}
                            </p>
                          </div>
                          {plan ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold bg-[#3453a7]/10 text-[#4f73d1] border border-[#3453a7]/30 rounded-md px-1.5 py-0.5 shrink-0">
                                  {dailyLabel(plan.daily_pages)}
                                </span>
                                <p className="text-xs text-neutral-500 truncate">
                                  {plan.start_surah_name} ←{" "}
                                  {plan.end_surah_name}
                                </p>
                              </div>
                              {/* شريط التقدم */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progress}%`,
                                      background:
                                        "linear-gradient(to right, #3453a7, #4f73d1)",
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-[#3453a7] w-8 text-left">
                                  {progress}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400">
                              لا توجد خطة
                            </p>
                          )}
                        </div>

                        {/* أزرار */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openAddDialog(student)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] border border-[#3453a7]/30 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {plan ? "تعديل الخطة" : "إضافة خطة"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      </main>

      {/* نافذة إضافة الخطة */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-w-md w-[calc(100vw-1rem)] max-h-[92vh] flex-col bg-white rounded-2xl p-0 overflow-hidden"
          dir="rtl"
          onInteractOutside={handlePlanDialogOutsideInteraction}
          onPointerDownOutside={handlePlanDialogOutsideInteraction}
        >
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent">
            <DialogTitle className="flex w-full items-center justify-start gap-2 pl-1 text-left text-lg font-bold text-[#1a2332]">
              <Target className="w-5 h-5 text-[#3453a7]" />
              {isEditingPlan ? "تعديل خطة حفظ" : "إضافة خطة حفظ"}{selectedStudent ? ` إلى ${selectedStudent.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
            {masteryJuzLabel && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
                أجزاء تحتاج إلى إتقان: {masteryJuzLabel}.
              </div>
            )}
            {/* الحفظ السابق وطريقة المراجعة والربط */}
            {!isMasteryOnlyStudent && (
            <div className="space-y-2 pt-2 pb-2 border-y border-[#3453a7]/20">
              {!shouldHidePreviousToggle && (
                <label
                  className="plan-history-checkbox text-sm font-semibold text-[#3453a7]"
                  onClick={(e) => {
                    if (!isPreviousLocked) return;

                    e.preventDefault();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasPrevious}
                    disabled={isPreviousLocked}
                    onChange={(e) => setHasPrevious(e.target.checked)}
                  />
                  <span className="plan-history-checkbox__label">هل يوجد حفظ سابق؟</span>
                  <span className="plan-history-checkbox__mark" aria-hidden="true" />
                </label>
              )}

              {isPreviousLocked && hasPrevious && (
                <p className="text-[11px] font-medium text-black">الحفظ السابق مقفل لأنه محفوظ فعلياً، ويجب حذف الخطة إذا أردت إعادة حفظ الطالب.</p>
              )}

              {hasPrevious && !(isEditingPlan && isPreviousLocked) && (
                <div className="bg-[#3453a7]/5 p-3 rounded-xl border border-[#3453a7]/20 space-y-3 mt-2">
                  {previousRanges.map((range, index) => (
                    <div key={range.id} className={`rounded-xl border border-[#3453a7]/15 bg-white/80 p-3 space-y-3 transition-all duration-200 ${removingPreviousRangeIds.includes(range.id) ? "opacity-0 scale-[0.98] -translate-y-1 pointer-events-none" : "opacity-100 scale-100 translate-y-0"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#1a2332]">المحفوظ السابق {index + 1}</p>
                        {!isPreviousLocked && previousRanges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePreviousRange(range.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-rose-600 transition-colors hover:bg-rose-50 disabled:pointer-events-none"
                            aria-label={`حذف المحفوظ السابق ${index + 1}`}
                            disabled={removingPreviousRangeIds.includes(range.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5 flex flex-col w-full">
                          <label className="text-xs font-semibold text-[#1a2332]">بداية الحفظ السابق</label>
                          <div className="flex items-center gap-2 w-full">
                            <Select value={range.startSurah} onValueChange={(value) => updatePreviousRange(range.id, { startSurah: value, startVerse: "" })} disabled={isPreviousLocked}>
                              <SelectTrigger className="flex-1 h-9 border-[#3453a7]/40 text-xs bg-white px-2" dir="rtl">
                                <SelectValue placeholder="اختر السورة" />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-56">
                                {getPreviousRangeSurahOptions(range, "start").map((surah) => (
                                  <SelectItem key={surah.number} value={String(surah.number)} className="text-xs text-right">
                                    {surah.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={range.startVerse} onValueChange={(value) => updatePreviousRange(range.id, { startVerse: value })} disabled={isPreviousLocked || !range.startSurah || getPreviousRangeStartVerseOptions(range).length === 0}>
                              <SelectTrigger className="w-[84px] h-9 border-[#3453a7]/40 text-xs bg-white px-2" dir="rtl">
                                <SelectValue placeholder="الآية" />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-48">
                                {getPreviousRangeStartVerseOptions(range).map((verse) => (
                                  <SelectItem key={verse} value={String(verse)} className="text-xs text-right">
                                    {verse}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5 flex flex-col w-full">
                          <label className="text-xs font-semibold text-[#1a2332]">نهاية الحفظ السابق</label>
                          <div className="flex items-center gap-2 w-full">
                            <Select value={range.endSurah} onValueChange={(value) => updatePreviousRange(range.id, { endSurah: value, endVerse: "" })} disabled={isPreviousLocked}>
                              <SelectTrigger className="flex-1 h-9 border-[#3453a7]/40 text-xs bg-white px-2" dir="rtl">
                                <SelectValue placeholder="اختر السورة" />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-56">
                                {getPreviousRangeSurahOptions(range, "end").map((surah) => (
                                  <SelectItem key={surah.number} value={String(surah.number)} className="text-xs text-right">
                                    {surah.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={range.endVerse} onValueChange={(value) => updatePreviousRange(range.id, { endVerse: value })} disabled={isPreviousLocked || !range.endSurah || getPreviousRangeEndVerseOptions(range).length === 0}>
                              <SelectTrigger className="w-[84px] h-9 border-[#3453a7]/40 text-xs bg-white px-2" dir="rtl">
                                <SelectValue placeholder="الآية" />
                              </SelectTrigger>
                              <SelectContent dir="rtl" className="max-h-48">
                                {getPreviousRangeEndVerseOptions(range).map((verse) => (
                                  <SelectItem key={verse} value={String(verse)} className="text-xs text-right">
                                    {verse}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!isPreviousLocked && (
                    <button
                      type="button"
                      onClick={addPreviousRange}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#3453a7]/35 px-3 py-2 text-xs font-semibold text-[#3453a7] hover:bg-white"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة محفوظ سابق
                    </button>
                  )}
                </div>
              )}
            </div>
            )}

            {/* بداية ونهاية الخطة والمقدار اليومي */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  بداية الخطة
                </label>
                
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#3453a7]/40 text-sm bg-white text-right hover:border-[#3453a7] transition-colors">
                      <span
                        className={
                          startSurah
                            ? "text-[#1a2332] font-medium"
                            : "text-neutral-400"
                        }
                      >
                        {startSurah
                          ? SURAHS.find(
                              (s) => s.number === parseInt(startSurah),
                            )?.name
                          : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-0" align="start" side="bottom" sideOffset={6} dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput
                        placeholder="ابحث عن سورة..."
                        className="text-sm h-9"
                      />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList
                        className="max-h-64 overflow-y-auto overscroll-contain touch-pan-y surah-scroll"
                        onWheel={(e) => {
                          e.stopPropagation();
                          e.currentTarget.scrollTop += e.deltaY;
                        }}
                      >
                        {startSurahOptions.map((s) => (
                          <CommandItem
                            key={s.number}
                            id={`start-surah-${s.number}`}
                            value={`${s.number} ${s.name}`}
                            onSelect={() => {
                              setStartSurah(String(s.number));
                              setStartOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {startSurah === String(s.number) && (
                              <Check className="w-3.5 h-3.5 text-[#3453a7]" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                    </div>
                    
                      <Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah || startVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-10 border-[#3453a7]/40 hover:border-[#3453a7] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 overscroll-contain touch-pan-y" position="popper" side="bottom" dir="rtl">
                            {startVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                  </div>
              </div>
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  نهاية الخطة
                </label>
                
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#3453a7]/40 text-sm bg-white text-right hover:border-[#3453a7] transition-colors">
                      <span
                        className={
                          isEndValid
                            ? "text-[#1a2332] font-medium"
                            : "text-neutral-400"
                        }
                      >
                        {isEndValid
                          ? SURAHS.find((s) => s.number === parseInt(endSurah))
                              ?.name
                          : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-0" align="start" side="bottom" sideOffset={6} dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput
                        placeholder="ابحث عن سورة..."
                        className="text-sm h-9"
                      />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList
                        className="max-h-64 overflow-y-auto overscroll-contain touch-pan-y surah-scroll"
                        onWheel={(e) => {
                          e.stopPropagation();
                          e.currentTarget.scrollTop += e.deltaY;
                        }}
                      >
                        {endSurahOptions.map((s) => (
                          <CommandItem
                            key={s.number}
                            id={`end-surah-${s.number}`}
                            value={`${s.number} ${s.name}`}
                            onSelect={() => {
                              setEndSurah(String(s.number));
                              setEndOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {endSurah === String(s.number) && (
                              <Check className="w-3.5 h-3.5 text-[#3453a7]" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                    </div>
                    <Select value={endVerse} onValueChange={setEndVerse} disabled={!endSurah || endVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-10 border-[#3453a7]/40 hover:border-[#3453a7] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 overscroll-contain touch-pan-y" position="popper" side="bottom" dir="rtl">
                            {endVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select></div>
                {startSurah && endSurahOptions.length === 0 && (
                  <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>
                )}
              </div>

            </div>
            
            <div className="mb-2 grid grid-cols-2 gap-3 pb-2">
              <div className="col-span-2 min-w-0 space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  المقدار اليومي
                </label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger
                    className="border-[#3453a7]/40 focus:border-[#3453a7] rounded-xl text-right bg-white text-sm [&>span]:truncate"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {DAILY_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-right dir-rtl"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  مقدار المراجعة اليومي
                </label>
                <Select
                  value={muraajaaMode === "weekly_distributed" ? "weekly" : muraajaaPages}
                  onValueChange={handleMuraajaaChange}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#3453a7]/40 focus:border-[#3453a7] rounded-xl text-right bg-white text-sm [&>span]:truncate"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {MURAAJAA_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  مقدار الربط اليومي
                </label>
                <Select
                  value={rabtPages}
                  onValueChange={setRabtPages}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#3453a7]/40 focus:border-[#3453a7] rounded-xl text-right bg-white text-sm [&>span]:truncate"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {RABT_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* معاينة الخطة */}
            {previewTotal > 0 &&
              (() => {
                const startNum = parseInt(startSurah);
                const endNum = parseInt(endSurah);
                const adjustedPreview = getAdjustedPreviewRange({
                  startSurahNumber: startNum,
                  startVerseNumber: startVerse ? parseInt(startVerse) : 1,
                  endSurahNumber: endNum,
                  endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === endNum)?.verseCount || 1),
                  dailyPages: parseFloat(dailyPages),
                  direction,
                  prevStartSurah,
                  prevStartVerse,
                  prevEndSurah,
                  prevEndVerse,
                  completedJuzs: selectedStudent?.completed_juzs,
                });
                const actuallStartSurah = SURAHS.find((s) => s.number === adjustedPreview.startSurahNumber);
                const actualEndSurah = SURAHS.find((s) => s.number === adjustedPreview.endSurahNumber);
                return (
                  <div className="rounded-xl bg-[#3453a7]/8 border border-[#3453a7]/30 p-4 space-y-3">
                    <p className="text-xs font-bold text-[#3453a7]">
                      معاينة الخطة
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold text-xs">
                        تبدأ من
                      </span>
                      <span className="font-bold text-[#1a2332]">
                        {actuallStartSurah?.name}
                        {adjustedPreview.startVerseNumber ? ` آية ${adjustedPreview.startVerseNumber}` : ""}
                      </span>
                      <span className="text-neutral-300">←</span>
                      <span className="text-neutral-500 text-xs">
                        {actualEndSurah?.name}
                        {endVerse ? ` آية ${endVerse}` : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#1a2332]">
                          {formattedPreviewTotal}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          وجهاً إجمالاً
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#1a2332]">
                          {previewDays}
                        </p>
                        <p className="text-[11px] text-neutral-400">يوماً</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* رسالة الحفظ */}
            {saveMsg && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  saveMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {saveMsg.text}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#3453a7]/25 bg-white px-6 py-4 flex gap-3">
            <Button
              onClick={handleSavePlan}
              disabled={isSaving || !startSurah || !endSurah}
              className="flex-1 rounded-xl h-10 bg-[#3453a7] text-white hover:bg-[#24428f] hover:text-white disabled:bg-[#3453a7]/45 disabled:text-white/80 disabled:opacity-100 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ الخطة"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10"
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={weeklyReviewDialogOpen} onOpenChange={setWeeklyReviewDialogOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[500px]" dir="rtl">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <div className="space-y-1 text-right">
              <DialogTitle className="text-lg font-black text-[#1a2332]">التقسيم الأسبوعي للمراجعة</DialogTitle>
              <p className="text-xs text-slate-500">سيتم تقسيم مراجعة الطالب على مدار الأيام المحددة.</p>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">الحد الأدنى اليومي</label>
                <Select value={draftWeeklyReviewMinDailyPages} onValueChange={setDraftWeeklyReviewMinDailyPages} dir="rtl">
                  <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 bg-white text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {WEEKLY_REVIEW_MIN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">من يوم</label>
                <Select value={draftWeeklyReviewStartDay} onValueChange={setDraftWeeklyReviewStartDay} dir="rtl">
                  <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 bg-white text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {WEEKDAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">إلى يوم</label>
                <Select value={draftWeeklyReviewEndDay} onValueChange={setDraftWeeklyReviewEndDay} dir="rtl">
                  <SelectTrigger className="h-10 rounded-xl border-[#3453a7]/40 bg-white text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {WEEKDAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-start gap-3 pt-1">
              <Button variant="outline" onClick={() => setWeeklyReviewDialogOpen(false)} className="border-[#3453a7]/40 text-neutral-600">
                إلغاء
              </Button>
              <Button onClick={handleSaveWeeklyReviewConfig} className="bg-[#3453a7] text-white hover:bg-[#274187]">
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/15 bg-gradient-to-r from-[#eef3ff] to-transparent">
            <DialogTitle className="text-lg font-bold text-[#1a2332]">إعادة حفظ طالب</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-3">
            {isResetDialogLoading ? (
              <div className="flex justify-center py-10"><SiteLoader size="md" /></div>
            ) : !resetDialogCircle ? (
              circles.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-10">لا توجد حلقات</p>
              ) : (
                circles.map((circle) => (
                  <button
                    key={circle.id}
                    onClick={() => setResetDialogCircle(circle.name)}
                    className="w-full flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-right transition-colors hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1a2332]">{circle.name}</p>
                      <p className="text-[11px] text-neutral-400">{circle.studentCount} طالب</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  </button>
                ))
              )
            ) : (
              (() => {
                const circleStudents = resetDialogStudents.filter((student) => (student.halaqah || "").trim() === resetDialogCircle.trim());

                return (
                  <div className="space-y-3">
                    {circleStudents.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-10">لا يوجد طلاب في هذه الحلقة</p>
                    ) : (
                      circleStudents.map((student) => {
                        const deletionItems = getStudentMemorizedDeletionItems(student);
                        const hasStoredMemorized = deletionItems.length > 0;

                        return (
                          <div key={student.id} className="rounded-xl border border-neutral-200 px-4 py-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1a2332] truncate">{student.name}</p>
                                <p className="text-[11px] text-neutral-400">{hasStoredMemorized ? `لديه ${deletionItems.length} مقطع محفوظ` : "لا يوجد محفوظ سابق"}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setMemorizationEditorStudentId(student.id)}
                                  disabled={!hasStoredMemorized || resettingStudentId === student.id}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  حذف بعض المحفوظ
                                </button>
                                <button
                                  onClick={() => handleResetMemorization(student)}
                                  disabled={!hasStoredMemorized || resettingStudentId === student.id}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  حذف كامل المحفوظ
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })()
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="rounded-xl border-neutral-300">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memorizationEditorStudentId} onOpenChange={(open) => {
        if (!open) {
          setMemorizationEditorStudentId(null);
          setMemorizationActionMsg(null);
        }
      }}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/15 bg-gradient-to-r from-[#eef3ff] to-transparent">
            <DialogTitle className="text-lg font-bold text-[#1a2332]">حذف بعض المحفوظ</DialogTitle>
            <p className="mt-1 text-xs text-neutral-600">اختر الجزء الذي تريد حذفه من محفوظ الطالب الحالي.</p>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-3">
            {(() => {
              const student = students.find((item) => item.id === memorizationEditorStudentId) || null;
              const deletionItems = student ? getStudentMemorizedDeletionItems(student) : [];

              if (!student) {
                return <p className="text-sm text-neutral-400 text-center py-10">تعذر العثور على الطالب</p>;
              }

              if (deletionItems.length === 0) {
                return <p className="text-sm text-neutral-400 text-center py-10">لا يوجد محفوظ حالي لهذا الطالب</p>;
              }

              return (
                <>
                  {memorizationActionMsg?.studentId === student.id && (
                    <div className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${memorizationActionMsg.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
                      {memorizationActionMsg.text}
                    </div>
                  )}

                  <div className="space-y-2">
                    {deletionItems.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1a2332] truncate">{item.label}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemorizedPortion(student, item.range)}
                          disabled={resettingStudentId === student.id}
                          className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
            <Button variant="outline" onClick={() => { setMemorizationEditorStudentId(null); setMemorizationActionMsg(null); }} className="rounded-xl border-neutral-300">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
