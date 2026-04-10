import fs from "fs"
import path from "path"
import { createAdminClient } from "@/lib/supabase/admin"
import { WHATSAPP_WORKER_STATE_SETTING_ID } from "@/lib/site-settings-constants"

const STATUS_FILE_PATH = process.env.WHATSAPP_STATUS_FILE_PATH || path.join(process.cwd(), "whatsapp-worker", "status.json")
const QR_IMAGE_PATH = process.env.WHATSAPP_QR_IMAGE_PATH || path.join(process.cwd(), "whatsapp-worker", "current-qr.png")
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

export function getDefaultWhatsAppWorkerStatus() {
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
  const hasQr = Boolean(payload.qrAvailable && (payload.qrValue || qrExists))
  const isConnected = Boolean(workerOnline && payload.ready && payload.authenticated && payload.status === "connected")

  return {
    ...fallback,
    ...payload,
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

function getStatusTimestamp(status: ReturnType<typeof getDefaultWhatsAppWorkerStatus>) {
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
