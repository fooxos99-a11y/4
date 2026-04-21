import type { ExamPortionType } from "@/lib/exam-portion-settings"

export type ExamPortionRecordLike = {
  portion_type?: string | null
  portion_number?: number | null
  juz_number?: number | null
  passed?: boolean | null
}

export function normalizeExamPortionType(value: unknown): ExamPortionType {
  return value === "hizb" ? "hizb" : "juz"
}

export function getExamPortionLabel(portionType: ExamPortionType, portionNumber?: number | null, fallback = "") {
  if (!portionNumber || !Number.isInteger(portionNumber)) {
    return fallback
  }

  return portionType === "hizb" ? `الحزب ${portionNumber}` : `الجزء ${portionNumber}`
}

export function getExamPortionCount(portionType: ExamPortionType) {
  return portionType === "hizb" ? 60 : 30
}

export function isValidExamPortionNumber(portionType: ExamPortionType, portionNumber?: number | null) {
  if (!portionNumber || !Number.isInteger(portionNumber)) {
    return false
  }

  const max = getExamPortionCount(portionType)
  return portionNumber >= 1 && portionNumber <= max
}

export function getJuzNumberForPortion(portionType: ExamPortionType, portionNumber?: number | null) {
  if (!portionNumber || !Number.isInteger(portionNumber)) {
    return null
  }

  return portionType === "hizb" ? Math.ceil(portionNumber / 2) : portionNumber
}

export function getEquivalentPortionNumbers(sourceType: ExamPortionType, sourceNumber: number, targetType: ExamPortionType) {
  if (sourceType === targetType) {
    return [sourceNumber]
  }

  if (sourceType === "juz" && targetType === "hizb") {
    return [sourceNumber * 2 - 1, sourceNumber * 2]
  }

  return [Math.ceil(sourceNumber / 2)]
}

export function getPortionIdentity(record: Pick<ExamPortionRecordLike, "portion_type" | "portion_number" | "juz_number">) {
  const portionType = normalizeExamPortionType(record.portion_type)
  const portionNumber = Number(record.portion_number || record.juz_number || 0)

  return {
    portionType,
    portionNumber,
    juzNumber: getJuzNumberForPortion(portionType, portionNumber),
  }
}

export function getPassedPortionNumbers(records: ExamPortionRecordLike[], targetType: ExamPortionType) {
  const directPassed = new Set<number>()
  const passedHizbs = new Set<number>()

  for (const record of records) {
    if (!record.passed) continue

    const { portionType, portionNumber } = getPortionIdentity(record)
    if (!portionNumber) continue

    if (targetType === "hizb") {
      for (const convertedNumber of getEquivalentPortionNumbers(portionType, portionNumber, "hizb")) {
        directPassed.add(convertedNumber)
      }
      continue
    }

    if (portionType === "juz") {
      directPassed.add(portionNumber)
      continue
    }

    passedHizbs.add(portionNumber)
  }

  if (targetType === "juz") {
    for (let juzNumber = 1; juzNumber <= 30; juzNumber += 1) {
      const firstHizb = juzNumber * 2 - 1
      const secondHizb = juzNumber * 2
      if (passedHizbs.has(firstHizb) && passedHizbs.has(secondHizb)) {
        directPassed.add(juzNumber)
      }
    }
  }

  return directPassed
}

export function buildExamPortionRecordMap<T extends ExamPortionRecordLike>(records: T[], targetType: ExamPortionType) {
  const entries = new Map<number, T & { portion_type: ExamPortionType; portion_number: number; juz_number: number | null }>()
  const passedTargetNumbers = getPassedPortionNumbers(records, targetType)

  for (const record of records) {
    const { portionType, portionNumber } = getPortionIdentity(record)
    if (!portionNumber) continue

    const mappedNumbers = getEquivalentPortionNumbers(portionType, portionNumber, targetType)
    for (const mappedNumber of mappedNumbers) {
      if (entries.has(mappedNumber)) continue

      entries.set(mappedNumber, {
        ...record,
        portion_type: targetType,
        portion_number: mappedNumber,
        juz_number: getJuzNumberForPortion(targetType, mappedNumber),
        passed: passedTargetNumbers.has(mappedNumber)
          ? true
          : record.passed === false
            ? false
            : record.passed ?? null,
      })
    }
  }

  return entries
}