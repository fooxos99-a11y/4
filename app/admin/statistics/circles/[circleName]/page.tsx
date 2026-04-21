"use client";

import { useParams } from "next/navigation";

import { CircleWeeklyReports } from "@/components/circle-weekly-reports";

export default function CircleStudentsPage() {
  const params = useParams();
  const circleName = decodeURIComponent(String(params.circleName ?? ""));

  return <CircleWeeklyReports circleName={circleName} backHref="/admin/statistics" backLabel="العودة للإحصائيات" />;
}