export const HAFIZ_EXTRA_PAGE_VALUES = [0.5, 1, 2] as const

export type HafizExtraPages = (typeof HAFIZ_EXTRA_PAGE_VALUES)[number]

export function normalizeHafizExtraPages(value: unknown): HafizExtraPages | null {
  const numericValue = Number(value)

  return HAFIZ_EXTRA_PAGE_VALUES.includes(numericValue as HafizExtraPages)
    ? (numericValue as HafizExtraPages)
    : null
}

export function getHafizExtraPoints(value: unknown) {
  const normalizedValue = normalizeHafizExtraPages(value)

  if (normalizedValue === 2) {
    return 20
  }

  if (normalizedValue === 1) {
    return 10
  }

  if (normalizedValue === 0.5) {
    return 5
  }

  return 0
}

export function getHafizExtraLabel(value: unknown) {
  const normalizedValue = normalizeHafizExtraPages(value)

  if (normalizedValue === 2) {
    return "وجهان"
  }

  if (normalizedValue === 1) {
    return "وجه"
  }

  if (normalizedValue === 0.5) {
    return "نصف وجه"
  }

  return null
}