import fs from "fs"
import path from "path"
import { createAdminClient } from "@/lib/supabase/admin"
import { WHATSAPP_WORKER_STATE_SETTING_ID } from "@/lib/whatsapp-site-config"

function sanitizeInstanceSlug(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getSupabaseProjectRef(url: string | undefined) {
  try {
    const hostname = new URL(String(url || "")).hostname
    return hostname.split(".")[0] || null
  } catch {
    return null
  }
}

function getDefaultInstanceSlug() {
  const explicitSlug = sanitizeInstanceSlug(process.env.WHATSAPP_INSTANCE_SLUG)
  if (explicitSlug) {
    return explicitSlug
  }

  const configuredClientId = sanitizeInstanceSlug(process.env.WHATSAPP_CLIENT_ID)
  if (configuredClientId) {
    return configuredClientId
  }

  const projectRef = sanitizeInstanceSlug(process.env.SUPABASE_PROJECT_REF || getSupabaseProjectRef(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL))
  if (projectRef) {
    return projectRef
  }

  const portToken = sanitizeInstanceSlug(process.env.PORT)
  if (portToken) {
    return `port-${portToken}`
  }

  return "default"
}

const INSTANCE_SLUG = getDefaultInstanceSlug()
const STATUS_FILE_PATH = process.env.WHATSAPP_STATUS_FILE_PATH || path.join(process.cwd(), "whatsapp-worker", `status-${INSTANCE_SLUG}.json`)
const QR_IMAGE_PATH = process.env.WHATSAPP_QR_IMAGE_PATH || path.join(process.cwd(), "whatsapp-worker", `current-qr-${INSTANCE_SLUG}.png`)
const ONLINE_THRESHOLD_MS = 45000

type WorkerStatusPayload = {
  status?: string
  qrAvailable?: boolean
  ready?: boolean
  authenticated?: boolean
  lastUpdatedAt?: string | null
  lastHeartbeatAt?: string | null
  qrUpdatedAt?: string | null
  connectedAt?: string | null
  disconnectedAt?: string | null
  authFailedAt?: string | null
  lastError?: string | null
  qrValue?: string | null
}

type WhatsAppWorkerStatus = {
  status: string
  qrAvailable: boolean
  ready: boolean
  authenticated: boolean
  lastUpdatedAt: string | null
  lastHeartbeatAt: string | null
  qrUpdatedAt: string | null
  connectedAt: string | null
  disconnectedAt: string | null
  authFailedAt: string | null
  lastError: string | null
  workerOnline: boolean
  qrImageUrl: string | null
  qrValue: string | null
}

export function getDefaultWhatsAppWorkerStatus(): WhatsAppWorkerStatus {
  return {
    status: "not_started",
    qrAvailable: false,
    ready: false,
    authenticated: false,
    lastUpdatedAt: null,
    lastHeartbeatAt: null,
    qrUpdatedAt: null,
    connectedAt: null,
    disconnectedAt: null,
    authFailedAt: null,
    lastError: null,
    workerOnline: false,
    qrImageUrl: null as string | null,
    qrValue: null as string | null,
  }
}

function finalizeStatus(payload: WorkerStatusPayload, qrExists: boolean) {
  const fallback = getDefaultWhatsAppWorkerStatus()
  const heartbeatTime = payload.lastHeartbeatAt ? new Date(payload.lastHeartbeatAt).getTime() : 0
  const workerOnline = Boolean(heartbeatTime) && Date.now() - heartbeatTime <= ONLINE_THRESHOLD_MS
  const qrUpdatedAtTime = payload.qrUpdatedAt ? new Date(payload.qrUpdatedAt).getTime() : 0
  const disconnectedAtTime = payload.disconnectedAt ? new Date(payload.disconnectedAt).getTime() : 0
  const authFailedAtTime = payload.authFailedAt ? new Date(payload.authFailedAt).getTime() : 0
  const connectedAtTime = payload.connectedAt ? new Date(payload.connectedAt).getTime() : 0
  const normalizedStatus = String(payload.status || "not_started").trim().toLowerCase()
  const hasQrValue = Boolean(payload.qrValue)
  const hasQr = Boolean(
    (payload.qrAvailable && (hasQrValue || qrExists)) ||
    (hasQrValue && !payload.authenticated)
  )
  const shouldPreserveQrState = Boolean(
    hasQr &&
    !payload.authenticated &&
    qrUpdatedAtTime &&
    qrUpdatedAtTime >= Math.max(disconnectedAtTime, authFailedAtTime, connectedAtTime)
  )
  const isConnected = Boolean(workerOnline && payload.ready && payload.authenticated && normalizedStatus === "connected")

  const resolvedStatus = shouldPreserveQrState && ["disconnected", "reconnecting", "unknown", "starting", "not_started"].includes(normalizedStatus)
    ? "waiting_for_qr"
    : normalizedStatus || "not_started"

  return {
    ...fallback,
    ...payload,
    status: resolvedStatus,
    ready: isConnected,
    authenticated: isConnected,
    qrAvailable: hasQr,
    workerOnline,
    qrImageUrl: hasQr ? `/api/whatsapp/qr?t=${encodeURIComponent(payload.qrUpdatedAt || payload.lastUpdatedAt || Date.now().toString())}` : null,
  }
}

function readLocalWhatsAppWorkerStatus() {
  const fallback = getDefaultWhatsAppWorkerStatus()

  try {
    let payload: WorkerStatusPayload = fallback

    if (fs.existsSync(STATUS_FILE_PATH)) {
      const rawStatus = fs.readFileSync(STATUS_FILE_PATH, "utf8")
      payload = {
        ...payload,
        ...JSON.parse(rawStatus),
      }
    }

    return finalizeStatus(payload, fs.existsSync(QR_IMAGE_PATH))
  } catch {
    return fallback
  }
}

function getStatusTimestamp(status: WhatsAppWorkerStatus) {
  const value = status.lastUpdatedAt || status.lastHeartbeatAt || status.qrUpdatedAt || status.connectedAt || status.disconnectedAt || null
  return value ? new Date(value).getTime() : 0
}

export async function readWhatsAppWorkerStatus() {
  const localStatus = readLocalWhatsAppWorkerStatus()

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", WHATSAPP_WORKER_STATE_SETTING_ID)
      .maybeSingle()

    if (!error && data?.value) {
      const sharedStatus = finalizeStatus(data.value as WorkerStatusPayload, false)
      return getStatusTimestamp(localStatus) > getStatusTimestamp(sharedStatus) ? localStatus : sharedStatus
    }
  } catch {
    // Fall back to local status files when shared state is unavailable.
  }

  return localStatus
}

export function isWhatsAppWorkerReady(status: ReturnType<typeof getDefaultWhatsAppWorkerStatus>) {
  return Boolean(status.workerOnline && status.ready && status.authenticated && status.status === "connected")
}
