"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type AllowedRole = "student" | "teacher" | "deputy_teacher" | "admin" | "supervisor"

type VerifiedUser = {
  id: string
  name: string
  role: AllowedRole
  accountNumber: string
  halaqah?: string
}

type VerifiedRoleAccessState = {
  isLoading: boolean
  isAuthorized: boolean
  user: VerifiedUser | null
}

function clearStoredAuth() {
  localStorage.removeItem("isLoggedIn")
  localStorage.removeItem("userRole")
  localStorage.removeItem("account_number")
  localStorage.removeItem("accountNumber")
  localStorage.removeItem("userName")
  localStorage.removeItem("studentName")
  localStorage.removeItem("studentId")
  localStorage.removeItem("userHalaqah")
  localStorage.removeItem("currentUser")
}

function syncStoredAuth(user: VerifiedUser) {
  localStorage.setItem("isLoggedIn", "true")
  localStorage.setItem("userRole", user.role)
  localStorage.setItem("account_number", user.accountNumber)
  localStorage.setItem("accountNumber", user.accountNumber)
  localStorage.setItem("userName", user.name)
  localStorage.setItem("studentName", user.name)
  localStorage.setItem("userHalaqah", user.halaqah || "")
  localStorage.setItem(
    "currentUser",
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
      account_number: Number(user.accountNumber),
      halaqah: user.halaqah || "",
    }),
  )

  if (user.role === "student") {
    localStorage.setItem("studentId", user.id)
  }
}

export function useVerifiedRoleAccess(
  allowedRoles: AllowedRole[],
  redirectPath = "/login",
): VerifiedRoleAccessState {
  const router = useRouter()
  const allowedRolesKey = allowedRoles.join("|")
  const [state, setState] = useState<VerifiedRoleAccessState>({
    isLoading: true,
    isAuthorized: false,
    user: null,
  })

  useEffect(() => {
    let cancelled = false

    async function verifyAccess() {
      try {
        const sessionResponse = await fetch("/api/auth", {
          method: "GET",
          cache: "no-store",
        })

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          const sessionUser = sessionData.user as VerifiedUser | undefined

          if (sessionUser && allowedRoles.includes(sessionUser.role)) {
            syncStoredAuth(sessionUser)
            if (!cancelled) {
              setState({ isLoading: false, isAuthorized: true, user: sessionUser })
            }
            return
          }
        }

        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
        const storedAccountNumber = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")

        if (!isLoggedIn || !storedAccountNumber) {
          clearStoredAuth()
          router.replace(redirectPath)
          return
        }

        const supabase = createClient()
        const normalizedAccountNumber = String(storedAccountNumber)

        const { data: userRow } = await supabase
          .from("users")
          .select("id, name, role, account_number, halaqah")
          .eq("account_number", Number(normalizedAccountNumber))
          .maybeSingle()

        if (userRow && allowedRoles.includes(userRow.role as AllowedRole)) {
          const verifiedUser: VerifiedUser = {
            id: String(userRow.id),
            name: userRow.name || "",
            role: userRow.role as AllowedRole,
            accountNumber: String(userRow.account_number || normalizedAccountNumber),
            halaqah: userRow.halaqah || "",
          }

          syncStoredAuth(verifiedUser)
          if (!cancelled) {
            setState({ isLoading: false, isAuthorized: true, user: verifiedUser })
          }
          return
        }

        if (allowedRoles.includes("student")) {
          const { data: studentRow } = await supabase
            .from("students")
            .select("id, name, account_number, halaqah")
            .eq("account_number", Number(normalizedAccountNumber))
            .maybeSingle()

          if (studentRow) {
            const verifiedStudent: VerifiedUser = {
              id: String(studentRow.id),
              name: studentRow.name || "",
              role: "student",
              accountNumber: String(studentRow.account_number || normalizedAccountNumber),
              halaqah: studentRow.halaqah || "",
            }

            syncStoredAuth(verifiedStudent)
            if (!cancelled) {
              setState({ isLoading: false, isAuthorized: true, user: verifiedStudent })
            }
            return
          }
        }

        clearStoredAuth()
        router.replace(redirectPath)
      } catch {
        clearStoredAuth()
        router.replace(redirectPath)
      }
    }

    void verifyAccess()

    return () => {
      cancelled = true
    }
  }, [allowedRolesKey, redirectPath, router])

  return state
}