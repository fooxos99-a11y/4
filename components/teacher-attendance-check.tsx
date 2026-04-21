"use client"

import { useEffect, useState } from "react"
import { TeacherAttendanceModal } from "./teacher-attendance-modal"
import { getSaudiDateString } from "@/lib/saudi-time"

interface TeacherAttendanceCheckProps {
  teacherId?: string
  teacherName?: string
  accountNumber?: number
  triggerFromLogin?: boolean
}

export function TeacherAttendanceCheck({
  teacherId,
  teacherName,
  accountNumber,
  triggerFromLogin = false,
}: TeacherAttendanceCheckProps) {
  const [showModal, setShowModal] = useState(false)
  const [localTeacherId, setLocalTeacherId] = useState(teacherId)
  const [localTeacherName, setLocalTeacherName] = useState(teacherName)
  const [localAccountNumber, setLocalAccountNumber] = useState(accountNumber)

  useEffect(() => {
    // Get data from props
    setLocalTeacherId(teacherId)
    setLocalTeacherName(teacherName)
    setLocalAccountNumber(accountNumber)

    const checkDailyAttendance = async () => {
      if (!teacherId) return

      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
      const userRole = localStorage.getItem("userRole")

      // Get the last checked date
      const lastCheckedDate = localStorage.getItem("lastAttendanceCheckDate")
      const today = getSaudiDateString()

      if (isLoggedIn && userRole === "teacher") {
        // Show modal if it's a new day
        if (lastCheckedDate !== today) {
          try {
            // Check if attendance exists for today
            const response = await fetch(`/api/teacher-attendance?teacher_id=${teacherId}&date=${today}`)
            const data = await response.json()

            if (!data.exists) {
              // No attendance record for today, show modal
              setShowModal(true)
              localStorage.setItem("lastAttendanceCheckDate", today)
            }
          } catch (error) {
            console.error("[v0] Error checking daily attendance:", error)
          }
        }
      }
    }

    checkDailyAttendance()
  }, [teacherId, teacherName, accountNumber])

  if (!localTeacherId) {
    return null
  }

  return (
    <TeacherAttendanceModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      teacherId={localTeacherId}
      teacherName={localTeacherName || ""}
      accountNumber={localAccountNumber || 0}
    />
  )
}
