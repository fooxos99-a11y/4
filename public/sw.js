const CACHE_NAME = "habiib-pwa-v3"
const OFFLINE_URL = "/offline.html"
const APP_SHELL = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/%D8%B4%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D8%AC%D9%88%D8%A7%D9%84.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  const requestUrl = new URL(event.request.url)
  const isSameOrigin = requestUrl.origin === self.location.origin
  const isApiRequest = requestUrl.pathname.startsWith("/api/")
  const isNextAsset = requestUrl.pathname.startsWith("/_next/")

  if (!isSameOrigin) {
    return
  }

  if (isApiRequest || isNextAsset || event.request.cache === "no-store") {
    event.respondWith(fetch(event.request))
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request)
          return cachedPage || caches.match(OFFLINE_URL)
        }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkFetch
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = event.notification?.data?.url || "/notifications"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})

self.addEventListener("push", (event) => {
  if (!event.data) {
    return
  }

  let payload = null

  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: "إشعار جديد!",
      body: event.data.text(),
      url: "/notifications",
    }
  }

  event.waitUntil(
    self.registration.showNotification(typeof payload?.title === "string" && payload.title.trim() ? payload.title : "إشعار جديد!", {
      body: payload?.body || "لديك إشعار جديد",
      data: { url: payload?.url || "/notifications" },
      dir: "rtl",
      lang: "ar",
    }),
  )
})