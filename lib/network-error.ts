export function getOfflineErrorMessage(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "لا يوجد اتصال بالإنترنت"
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "لا يوجد اتصال بالإنترنت"
  }

  if (error instanceof Error && /failed to fetch|network/i.test(error.message)) {
    return "لا يوجد اتصال بالإنترنت"
  }

  return null
}