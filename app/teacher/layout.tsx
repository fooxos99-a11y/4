"use client"

import type { ReactNode } from "react"
import { SiteLoader } from "@/components/ui/site-loader"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { isLoading, isAuthorized } = useVerifiedRoleAccess(["teacher", "deputy_teacher"])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}