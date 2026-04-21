export function normalizeWhatsAppPhoneNumber(phoneNumber: string) {
  let cleanedPhone = String(phoneNumber || "").replace(/[^0-9]/g, "")

  if (!cleanedPhone) {
    throw new Error("رقم الهاتف غير صالح")
  }

  if (cleanedPhone.startsWith("00")) {
    cleanedPhone = cleanedPhone.slice(2)
  }

  if (/^05\d{8}$/.test(cleanedPhone)) {
    return `966${cleanedPhone.slice(1)}`
  }

  if (/^5\d{8}$/.test(cleanedPhone)) {
    return `966${cleanedPhone}`
  }

  if (!/^\d{8,15}$/.test(cleanedPhone)) {
    throw new Error("رقم الهاتف غير صالح")
  }

  return cleanedPhone
}

export function normalizeGuardianPhoneForStorage(phoneNumber: string) {
  let cleanedPhone = String(phoneNumber || "").replace(/[^0-9]/g, "")

  if (!cleanedPhone) {
    throw new Error("رقم الهاتف غير صالح")
  }

  if (cleanedPhone.startsWith("00")) {
    cleanedPhone = cleanedPhone.slice(2)
  }

  if (/^9665\d{8}$/.test(cleanedPhone)) {
    return `0${cleanedPhone.slice(3)}`
  }

  if (/^5\d{8}$/.test(cleanedPhone)) {
    return `0${cleanedPhone}`
  }

  if (/^05\d{8}$/.test(cleanedPhone)) {
    return cleanedPhone
  }

  if (!/^\d{8,15}$/.test(cleanedPhone)) {
    throw new Error("رقم الهاتف غير صالح")
  }

  return cleanedPhone
}

export function formatGuardianPhoneForDisplay(phoneNumber: string | null | undefined) {
  if (!phoneNumber) return "-"

  try {
    return normalizeGuardianPhoneForStorage(phoneNumber)
  } catch {
    return phoneNumber
  }
}