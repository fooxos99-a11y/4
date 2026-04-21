"use client"

import StudentsAchievementsAdmin from "../students-achievements.tsx";
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

export default function StudentsAchievementsAdminPage() {
  const { isLoading, isVerified } = useAdminAuth("إدارة الطلاب");

  if (isLoading || !isVerified) return (
    <SiteLoader fullScreen />
  );

  return <StudentsAchievementsAdmin />;
}
