export type HistoricalStudentPlan = {
  id?: string | null
  student_id: string
  start_date?: string | null
  created_at?: string | null
}

function getPlanEffectiveDate(plan: HistoricalStudentPlan) {
  const startDate = typeof plan.start_date === "string" && plan.start_date.trim().length > 0
    ? plan.start_date.trim()
    : null
  if (startDate) {
    return startDate
  }

  const createdAt = typeof plan.created_at === "string" && plan.created_at.trim().length > 0
    ? plan.created_at.trim().slice(0, 10)
    : null
  return createdAt
}

export function groupPlansByStudent<T extends HistoricalStudentPlan>(plans: T[]) {
  const plansByStudent = new Map<string, T[]>()

  for (const plan of plans) {
    const studentId = String(plan.student_id || "")
    if (!studentId) {
      continue
    }

    const existingPlans = plansByStudent.get(studentId)
    if (existingPlans) {
      existingPlans.push(plan)
    } else {
      plansByStudent.set(studentId, [plan])
    }
  }

  for (const studentPlans of plansByStudent.values()) {
    studentPlans.sort((left, right) => {
      const leftDate = getPlanEffectiveDate(left) || ""
      const rightDate = getPlanEffectiveDate(right) || ""

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate)
      }

      return String(left.created_at || "").localeCompare(String(right.created_at || ""))
    })
  }

  return plansByStudent
}

export function getPlanForDate<T extends HistoricalStudentPlan>(plans: T[], date: string) {
  let matchedPlan: T | null = null

  for (const plan of plans) {
    const effectiveDate = getPlanEffectiveDate(plan)
    if (!effectiveDate || effectiveDate > date) {
      continue
    }

    matchedPlan = plan
  }

  return matchedPlan
}