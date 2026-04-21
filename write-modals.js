// Helper to write all files
const fs = require('fs');

const write = (path, content) => fs.writeFileSync(path, content.trim() + '\n', 'utf8');

// 1. global-admin-modals.tsx
write('components/global-admin-modals.tsx', `
"use client"
import React, { Suspense } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { GlobalBulkAddStudentDialog } from "./admin-modals/global-bulk-add-student-dialog"
import { GlobalRemoveStudentDialog } from "./admin-modals/global-remove-student-dialog"
import { GlobalMoveStudentDialog } from "./admin-modals/global-move-student-dialog"
import { GlobalEditStudentDialog } from "./admin-modals/global-edit-student-dialog"
import { GlobalEditPointsDialog } from "./admin-modals/global-edit-points-dialog"

function AdminModalsContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const action = searchParams?.get("action")

  if (pathname === "/admin/dashboard") return null;

  return (
    <>
      {action === "bulk-add" && <GlobalBulkAddStudentDialog />}
      {action === "remove-student" && <GlobalRemoveStudentDialog />}
      {action === "transfer-student" && <GlobalMoveStudentDialog />}
      {action === "edit-student" && <GlobalEditStudentDialog />}
      {action === "edit-points" && <GlobalEditPointsDialog />}
    </>
  )
}

export function GlobalAdminModals() {
  return (
    <Suspense fallback={null}>
      <AdminModalsContent />
    </Suspense>
  )
}
`);
