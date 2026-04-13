try {
  require("dotenv").config({ path: process.env.WORKER_ENV_FILE || ".env.local" })
} catch (error) {
  console.warn("[WhatsApp Worker] dotenv is not installed; continuing with existing environment variables.")
}

const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")
const qrcode = require("qrcode-terminal")
const QRCode = require("qrcode")
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js")
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const QUEUE_TABLE = process.env.WHATSAPP_QUEUE_TABLE || "whatsapp_queue"
const HISTORY_TABLE = process.env.WHATSAPP_HISTORY_TABLE || "whatsapp_messages"
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, ".wwebjs_auth")
const QR_IMAGE_PATH = process.env.WHATSAPP_QR_IMAGE_PATH || path.join(__dirname, "current-qr.png")
const STATUS_FILE_PATH = process.env.WHATSAPP_STATUS_FILE_PATH || path.join(__dirname, "status.json")
const COMMAND_FILE_PATH = process.env.WHATSAPP_COMMAND_FILE_PATH || path.join(__dirname, "command.json")
const LOCK_FILE_PATH = process.env.WHATSAPP_LOCK_FILE_PATH || path.join(__dirname, "worker.lock")
const CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || "qabas-whatsapp-worker"
const WORKER_STATE_SETTING_ID = process.env.WHATSAPP_WORKER_STATE_SETTING_ID || "whatsapp_worker_state"
const WORKER_COMMAND_SETTING_ID = process.env.WHATSAPP_WORKER_COMMAND_SETTING_ID || "whatsapp_worker_command"
const MIN_DELAY_MS = Number(process.env.WHATSAPP_MIN_DELAY_MS || 5000)
const MAX_DELAY_MS = Number(process.env.WHATSAPP_MAX_DELAY_MS || 12000)
const BURST_SIZE = Number(process.env.WHATSAPP_BURST_SIZE || 20)
const BURST_PAUSE_MIN_MS = Number(process.env.WHATSAPP_BURST_PAUSE_MIN_MS || 10000)
const BURST_PAUSE_MAX_MS = Number(process.env.WHATSAPP_BURST_PAUSE_MAX_MS || 20000)
const INCOMING_SYNC_INTERVAL_MS = Number(process.env.WHATSAPP_INCOMING_SYNC_INTERVAL_MS || 30000)
const INCOMING_SYNC_CHAT_LIMIT = Number(process.env.WHATSAPP_INCOMING_SYNC_CHAT_LIMIT || 30)
const INCOMING_SYNC_MESSAGE_LIMIT = Number(process.env.WHATSAPP_INCOMING_SYNC_MESSAGE_LIMIT || 8)
const QUEUE_POLL_INTERVAL_MS = Number(process.env.WHATSAPP_QUEUE_POLL_INTERVAL_MS || 5000)
const IS_LINUX = process.platform === "linux"
const HEARTBEAT_INTERVAL_MS = Number(process.env.WHATSAPP_HEARTBEAT_INTERVAL_MS || 15000)
const CONNECTION_CHECK_INTERVAL_MS = Number(process.env.WHATSAPP_CONNECTION_CHECK_INTERVAL_MS || 10000)

const PUPPETEER_ARGS = IS_LINUX
  ? [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ]
  : ["--no-first-run"]

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Expected SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY."
  )
}

if (Number.isNaN(MIN_DELAY_MS) || Number.isNaN(MAX_DELAY_MS) || MIN_DELAY_MS <= 0 || MAX_DELAY_MS < MIN_DELAY_MS) {
  throw new Error("Invalid delay configuration. Ensure WHATSAPP_MIN_DELAY_MS and WHATSAPP_MAX_DELAY_MS are valid numbers.")
}

if (
  Number.isNaN(BURST_SIZE) ||
  Number.isNaN(BURST_PAUSE_MIN_MS) ||
  Number.isNaN(BURST_PAUSE_MAX_MS) ||
  BURST_SIZE <= 0 ||
  BURST_PAUSE_MIN_MS <= 0 ||
  BURST_PAUSE_MAX_MS < BURST_PAUSE_MIN_MS
) {
  throw new Error(
    "Invalid burst delay configuration. Ensure WHATSAPP_BURST_SIZE and burst pause values are valid numbers."
  )
}

if (
  Number.isNaN(INCOMING_SYNC_INTERVAL_MS) ||
  Number.isNaN(INCOMING_SYNC_CHAT_LIMIT) ||
  Number.isNaN(INCOMING_SYNC_MESSAGE_LIMIT) ||
  INCOMING_SYNC_INTERVAL_MS <= 0 ||
  INCOMING_SYNC_CHAT_LIMIT <= 0 ||
  INCOMING_SYNC_MESSAGE_LIMIT <= 0
) {
  throw new Error(
    "Invalid incoming sync configuration. Ensure incoming sync values are valid positive numbers."
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
})

const queue = []
const seenMessageIds = new Set()
let isProcessingQueue = false
let isWhatsappReady = false
let isResettingSession = false
let hasWorkerLock = false
let sentMessagesSincePause = 0
let isSyncingIncomingMessages = false
let isPersistingSharedState = false
let workerState = {
  status: "starting",
  qrAvailable: false,
  ready: false,
  authenticated: false,
  lastUpdatedAt: new Date().toISOString(),
  lastHeartbeatAt: new Date().toISOString(),
  qrUpdatedAt: null,
  connectedAt: null,
  disconnectedAt: null,
  authFailedAt: null,
  lastError: null,
  qrValue: null,
}

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
    dataPath: AUTH_DIR,
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: PUPPETEER_ARGS,
  },
})

function log(message, extra) {
  const timestamp = new Date().toISOString()

  if (extra === undefined) {
    console.log(`[${timestamp}] ${message}`)
    return
  }

  console.log(`[${timestamp}] ${message}`, extra)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomDelay() {
  const span = MAX_DELAY_MS - MIN_DELAY_MS
  return MIN_DELAY_MS + Math.floor(Math.random() * (span + 1))
}

function randomBurstPause() {
  const span = BURST_PAUSE_MAX_MS - BURST_PAUSE_MIN_MS
  return BURST_PAUSE_MIN_MS + Math.floor(Math.random() * (span + 1))
}

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error("Missing phone_number value.")
  }

  let normalized = String(phoneNumber).trim().replace(/[^\d]/g, "")

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2)
  }

  if (/^05\d{8}$/.test(normalized)) {
    normalized = `966${normalized.slice(1)}`
  } else if (/^5\d{8}$/.test(normalized)) {
    normalized = `966${normalized}`
  }

  if (!/^\d{8,15}$/.test(normalized)) {
    throw new Error(`Invalid phone_number format: ${phoneNumber}`)
  }

  return normalized
}

function toChatId(phoneNumber) {
  return `${normalizePhoneNumber(phoneNumber)}@c.us`
}

function buildOutgoingMedia(row) {
  const messageType = String(row?.message_type || "text").trim().toLowerCase()
  if (messageType !== "image") {
    return null
  }

  const mimeType = String(row?.media_mime_type || "").trim().toLowerCase()
  const mediaBase64 = String(row?.media_base64 || "").trim().replace(/\s+/g, "")
  const fileName = String(row?.media_file_name || "").trim() || undefined

  if (!mimeType || !mediaBase64) {
    throw new Error(`Outgoing image payload for message ${row?.id || "unknown"} is incomplete.`)
  }

  return new MessageMedia(mimeType, mediaBase64, fileName)
}

function extractWhatsAppMessageId(message) {
  return message?.id?._serialized || message?.id?.id || null
}

function extractIncomingMessageText(message) {
  if (!message) {
    return ""
  }

  if (message.type === "chat") {
    return String(message.body || "")
  }

  if (message.type === "image") {
    return `[صورة] ${String(message.caption || message.body || "").trim()}`.trim()
  }

  if (message.type === "video") {
    return `[فيديو] ${String(message.caption || message.body || "").trim()}`.trim()
  }

  if (message.type === "audio" || message.type === "ptt") {
    return "[رسالة صوتية]"
  }

  if (message.type === "document") {
    return `[مستند] ${String(message.filename || message.body || "").trim()}`.trim()
  }

  if (message.type === "location") {
    return `[موقع] ${String(message.location?.name || message.body || "").trim()}`.trim()
  }

  return `[${String(message.type || "رسالة")}] ${String(message.body || "").trim()}`.trim()
}

async function extractIncomingMediaPayload(message) {
  if (!message || (message.type !== "audio" && message.type !== "ptt")) {
    return {
      replyType: String(message?.type || "text"),
      mediaMimeType: null,
      mediaBase64: null,
    }
  }

  try {
    if (typeof message.downloadMedia !== "function") {
      return {
        replyType: String(message.type || "audio"),
        mediaMimeType: null,
        mediaBase64: null,
      }
    }

    const downloadedMedia = await message.downloadMedia()
    return {
      replyType: String(message.type || "audio"),
      mediaMimeType: downloadedMedia?.mimetype || "audio/ogg; codecs=opus",
      mediaBase64: downloadedMedia?.data || null,
    }
  } catch (error) {
    log(`Failed to download incoming WhatsApp media for message ${extractWhatsAppMessageId(message) || "unknown"}.`, error)
    return {
      replyType: String(message?.type || "audio"),
      mediaMimeType: null,
      mediaBase64: null,
    }
  }
}

async function updateSentMessageMetadata(id, whatsappMessageId) {
  if (!whatsappMessageId) {
    return
  }

  const { error } = await supabase
    .from("whatsapp_messages")
    .update({ message_id: whatsappMessageId })
    .eq("id", id)

  if (error && error.code !== "42P01") {
    log(`Failed to store WhatsApp message id for ${id}.`, error)
  }
}

function pickMostRecentOriginalMessage(rows, messageTimestamp) {
  const incomingTimeMs = typeof messageTimestamp === "number" && Number.isFinite(messageTimestamp)
    ? messageTimestamp * 1000
    : null

  for (const row of rows || []) {
    if (!incomingTimeMs || !row.created_at) {
      return row
    }

    const sentTimeMs = new Date(row.created_at).getTime()
    if (!Number.isFinite(sentTimeMs) || sentTimeMs <= incomingTimeMs) {
      return row
    }
  }

  return null
}

async function resolveOriginalMessageRecordId(message) {
  try {
    if (!message?.hasQuotedMsg || typeof message.getQuotedMessage !== "function") {
      return null
    }

    const quotedMessage = await message.getQuotedMessage()
    const quotedMessageId = extractWhatsAppMessageId(quotedMessage)

    if (!quotedMessageId) {
      return null
    }

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, phone_number, created_at")
      .eq("message_id", quotedMessageId)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      log(`Failed to resolve original message id for quoted WhatsApp message ${quotedMessageId}.`, error)
    }

    return data || null
  } catch (error) {
    log("Failed to inspect quoted WhatsApp message.", error)
    return null
  }
}

async function resolveOriginalMessageRecordIdByPhoneAndTime(chatId, messageTimestamp) {
  try {
    const chatIdToken = String(chatId || "").trim()

    if (chatIdToken) {
      const { data: lidRows, error: lidError } = await supabase
        .from("whatsapp_messages")
        .select("id, phone_number, created_at, message_id")
        .ilike("message_id", `%_${chatIdToken}_%`)
        .order("created_at", { ascending: false })
        .limit(20)

      if (lidError) {
        log(`Failed to resolve original message by chat id ${chatIdToken}.`, lidError)
      } else {
        const matchedByChatId = pickMostRecentOriginalMessage(lidRows || [], messageTimestamp)
        if (matchedByChatId) {
          return matchedByChatId
        }
      }
    }

    const normalizedPhone = normalizePhoneNumber(chatId)

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, phone_number, created_at")
      .eq("phone_number", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      log(`Failed to resolve original message by phone ${normalizedPhone}.`, error)
      return null
    }

    return pickMostRecentOriginalMessage(data || [], messageTimestamp)
  } catch (error) {
    log("Failed to inspect recent sent messages for incoming WhatsApp reply.", error)
    return null
  }
}

async function saveIncomingReply(message) {
  if (!message || message.fromMe) {
    return
  }

  const chatId = String(message.from || "")
  if (!chatId || chatId.endsWith("@g.us") || chatId === "status@broadcast") {
    return
  }

  const messageId = extractWhatsAppMessageId(message)
  const messageText = extractIncomingMessageText(message)
  const mediaPayload = await extractIncomingMediaPayload(message)

  if (!messageId || !messageText) {
    log("Incoming WhatsApp message skipped because it has no usable id or text.", {
      type: message?.type || null,
      hasId: Boolean(messageId),
      from: message?.from || null,
    })
    return
  }

  log(`Incoming WhatsApp message received from ${chatId}.`, {
    id: messageId,
    type: message.type || "unknown",
    hasQuotedMsg: Boolean(message.hasQuotedMsg),
  })

  let originalMessageRecord = await resolveOriginalMessageRecordId(message)

  if (!originalMessageRecord) {
    originalMessageRecord = await resolveOriginalMessageRecordIdByPhoneAndTime(chatId, message.timestamp)
  }

  if (!originalMessageRecord?.id) {
    log(`Skipping incoming WhatsApp message ${messageId} because it is not linked to a sent system message.`)
    return
  }

  const { data: existingReply, error: existingReplyError } = await supabase
    .from("whatsapp_replies")
    .select("id")
    .eq("original_message_id", originalMessageRecord.id)
    .limit(1)
    .maybeSingle()

  if (existingReplyError && existingReplyError.code !== "PGRST116") {
    log(`Failed checking existing first reply for original message ${originalMessageRecord.id}.`, existingReplyError)
    return
  }

  if (existingReply?.id) {
    log(`Skipping incoming WhatsApp message ${messageId} because the first reply for message ${originalMessageRecord.id} is already stored.`)
    return
  }

  const payload = {
    from_phone: originalMessageRecord.phone_number,
    message_text: messageText,
    message_id: messageId,
    timestamp: typeof message.timestamp === "number" ? message.timestamp : null,
    is_read: false,
    original_message_id: originalMessageRecord.id,
    reply_type: mediaPayload.replyType,
    media_mime_type: mediaPayload.mediaMimeType,
    media_base64: mediaPayload.mediaBase64,
  }

  const { error } = await supabase.from("whatsapp_replies").insert(payload)

  if (error) {
    if (error.code === "PGRST204" || error.code === "42703") {
      const fallbackPayload = {
        from_phone: payload.from_phone,
        message_text: payload.message_text,
        message_id: payload.message_id,
        timestamp: payload.timestamp,
        is_read: payload.is_read,
        original_message_id: payload.original_message_id,
      }

      const { error: fallbackError } = await supabase.from("whatsapp_replies").insert(fallbackPayload)

      if (!fallbackError || fallbackError.code === "23505") {
        return
      }

      log(`Failed to save incoming WhatsApp reply ${messageId} using fallback payload.`, fallbackError)
      return
    }

    if (error.code === "23505") {
      log(`Incoming WhatsApp reply ${messageId} already saved. Skipping duplicate.`)
      return
    }

    log(`Failed to save incoming WhatsApp reply ${messageId}.`, error)
    return
  }

  log(`Saved incoming WhatsApp reply ${messageId} from ${payload.from_phone}.`)
}

async function syncIncomingRepliesFromChats() {
  if (!isWhatsappReady || isSyncingIncomingMessages) {
    return
  }

  isSyncingIncomingMessages = true

  try {
    const chats = await whatsappClient.getChats()
    const recentDirectChats = chats
      .filter((chat) => !chat.isGroup && chat.id?._serialized !== "status@broadcast")
      .sort((a, b) => {
        const aTimestamp = Number(a.timestamp || 0)
        const bTimestamp = Number(b.timestamp || 0)
        return bTimestamp - aTimestamp
      })
      .slice(0, INCOMING_SYNC_CHAT_LIMIT)

    for (const chat of recentDirectChats) {
      if (typeof chat.fetchMessages !== "function") {
        continue
      }

      let messages = []
      try {
        messages = await chat.fetchMessages({ limit: INCOMING_SYNC_MESSAGE_LIMIT })
      } catch (error) {
        const chatId = chat.id?._serialized || chat.name || "unknown-chat"
        log(`Skipping chat ${chatId} during incoming reply sync because recent messages could not be loaded.`, error)
        continue
      }

      for (const message of messages) {
        if (!message?.fromMe) {
          await saveIncomingReply(message)
        }
      }
    }
  } catch (error) {
    log("Failed to sync incoming WhatsApp replies from chats.", error)
  } finally {
    isSyncingIncomingMessages = false
  }
}

function ensureStatusDirectory() {
  const directoryPath = path.dirname(STATUS_FILE_PATH)
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true })
  }
}

function ensureLockDirectory() {
  const directoryPath = path.dirname(LOCK_FILE_PATH)
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true })
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function releaseWorkerLock() {
  if (!hasWorkerLock) {
    return
  }

  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const rawLock = fs.readFileSync(LOCK_FILE_PATH, "utf8")
      const payload = rawLock.trim() ? JSON.parse(rawLock) : {}

      if (Number(payload.pid) === process.pid) {
        fs.unlinkSync(LOCK_FILE_PATH)
      }
    }
  } catch (error) {
    log("Failed to release WhatsApp worker lock.", error)
  } finally {
    hasWorkerLock = false
  }
}

function acquireWorkerLock() {
  ensureLockDirectory()

  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const rawLock = fs.readFileSync(LOCK_FILE_PATH, "utf8")
      const payload = rawLock.trim() ? JSON.parse(rawLock) : {}
      const existingPid = Number(payload.pid)

      if (isProcessAlive(existingPid) && existingPid !== process.pid) {
        log(`Another WhatsApp worker is already running with PID ${existingPid}. Exiting duplicate start.`)
        return false
      }

      fs.unlinkSync(LOCK_FILE_PATH)
    }

    fs.writeFileSync(
      LOCK_FILE_PATH,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
      "utf8",
    )
    hasWorkerLock = true
    return true
  } catch (error) {
    log("Failed to acquire WhatsApp worker lock.", error)
    return false
  }
}

function ensureCommandDirectory() {
  const directoryPath = path.dirname(COMMAND_FILE_PATH)
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true })
  }
}

async function persistWorkerStateToSupabase() {
  if (isPersistingSharedState) {
    return
  }

  isPersistingSharedState = true

  try {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: WORKER_STATE_SETTING_ID, value: workerState }, { onConflict: "id" })

    if (error) {
      log("Failed to persist WhatsApp worker state to Supabase.", error)
    }
  } catch (error) {
    log("Failed to sync WhatsApp worker state to Supabase.", error)
  } finally {
    isPersistingSharedState = false
  }
}

function persistWorkerState(partialState = {}) {
  const now = new Date().toISOString()
  workerState = {
    ...workerState,
    ...partialState,
    lastUpdatedAt: now,
    lastHeartbeatAt: partialState.lastHeartbeatAt || now,
  }

  try {
    ensureStatusDirectory()
    fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(workerState, null, 2), "utf8")
  } catch (error) {
    log("Failed to persist WhatsApp worker state.", error)
  }

  void persistWorkerStateToSupabase()
}

function isClientConnectedState(clientState) {
  return String(clientState || "").trim().toUpperCase() === "CONNECTED"
}

function isClientUnpairedState(clientState) {
  const normalizedState = String(clientState || "").trim().toUpperCase()
  return normalizedState === "UNPAIRED" || normalizedState === "UNPAIRED_IDLE"
}

async function verifyWhatsAppConnection() {
  if (isResettingSession || typeof whatsappClient.getState !== "function") {
    return
  }

  try {
    const clientState = await whatsappClient.getState()
    const normalizedState = String(clientState || "unknown").trim().toUpperCase()

    if (isClientConnectedState(normalizedState)) {
      if (!isWhatsappReady || workerState.status !== "connected" || !workerState.ready || !workerState.authenticated) {
        isWhatsappReady = true
        removeQrImage()
        persistWorkerState({
          status: "connected",
          qrAvailable: false,
          ready: true,
          authenticated: true,
          qrValue: null,
          connectedAt: workerState.connectedAt || new Date().toISOString(),
          lastError: null,
        })
      } else {
        persistWorkerState({ lastHeartbeatAt: new Date().toISOString() })
      }
      return
    }

    isWhatsappReady = false

    if (isClientUnpairedState(normalizedState)) {
      persistWorkerState({
        status: "disconnected",
        qrAvailable: false,
        ready: false,
        authenticated: false,
        qrValue: null,
        disconnectedAt: new Date().toISOString(),
        lastError: `WhatsApp state changed to ${normalizedState}`,
      })

      if (!isResettingSession) {
        void resetWhatsAppSession()
      }
      return
    }

    persistWorkerState({
      status: normalizedState === "OPENING" || normalizedState === "PAIRING" ? "authenticating" : "disconnected",
      ready: false,
      authenticated: false,
      qrAvailable: fs.existsSync(QR_IMAGE_PATH),
      qrValue: null,
      disconnectedAt: normalizedState === "OPENING" || normalizedState === "PAIRING" ? workerState.disconnectedAt : new Date().toISOString(),
      lastError: normalizedState === "OPENING" || normalizedState === "PAIRING" ? null : `WhatsApp state changed to ${normalizedState}`,
    })
  } catch (error) {
    log("Failed to verify live WhatsApp connection state.", error)
  }
}

function removeQrImage() {
  try {
    if (fs.existsSync(QR_IMAGE_PATH)) {
      fs.unlinkSync(QR_IMAGE_PATH)
    }
  } catch (error) {
    log("Failed to clean up QR image.", error)
  }

  persistWorkerState({ qrAvailable: false, qrUpdatedAt: null, qrValue: null })
}

function removeAuthSessionDirectory() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    }
  } catch (error) {
    log("Failed to remove WhatsApp auth directory.", error)
  }
}

function readPendingCommand() {
  try {
    if (!fs.existsSync(COMMAND_FILE_PATH)) {
      return null
    }

    const rawCommand = fs.readFileSync(COMMAND_FILE_PATH, "utf8")
    fs.unlinkSync(COMMAND_FILE_PATH)

    if (!rawCommand.trim()) {
      return null
    }

    return JSON.parse(rawCommand)
  } catch (error) {
    log("Failed to read WhatsApp worker command.", error)
    return null
  }
}

async function readPendingSharedCommand() {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", WORKER_COMMAND_SETTING_ID)
      .maybeSingle()

    if (error || !data?.value?.action) {
      return null
    }

    await supabase
      .from("site_settings")
      .upsert({ id: WORKER_COMMAND_SETTING_ID, value: {} }, { onConflict: "id" })

    return data.value
  } catch (error) {
    log("Failed to read shared WhatsApp worker command.", error)
    return null
  }
}

async function resetWhatsAppSession() {
  if (isResettingSession) {
    return
  }

  isResettingSession = true
  isWhatsappReady = false
  removeQrImage()

  persistWorkerState({
    status: "fetching_qr",
    qrAvailable: false,
    ready: false,
    authenticated: false,
    qrValue: null,
    disconnectedAt: new Date().toISOString(),
    connectedAt: null,
    authFailedAt: null,
    lastError: null,
  })

  try {
    try {
      await whatsappClient.logout()
    } catch (error) {
      log("WhatsApp logout returned an error during reset.", error)
    }

    try {
      await whatsappClient.destroy()
    } catch (error) {
      log("WhatsApp destroy returned an error during reset.", error)
    }

    removeAuthSessionDirectory()
    releaseWorkerLock()

    persistWorkerState({
      status: "fetching_qr",
      qrAvailable: false,
      ready: false,
      authenticated: false,
      qrValue: null,
      lastError: null,
    })

    const detachedWorker = spawn(process.execPath, [__filename], {
      cwd: __dirname,
      env: process.env,
      detached: true,
      stdio: "ignore",
    })

    detachedWorker.unref()
    process.exit(0)
  } catch (error) {
    log("Failed to reset WhatsApp session.", error)
    persistWorkerState({
      status: "auth_failed",
      qrAvailable: false,
      ready: false,
      authenticated: false,
      qrValue: null,
      authFailedAt: new Date().toISOString(),
      lastError: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isResettingSession = false
  }
}

function subscribeToCommands() {
  ensureCommandDirectory()

  setInterval(async () => {
    const command = readPendingCommand() || await readPendingSharedCommand()
    if (!command || !command.action) {
      return
    }

    if (command.action === "disconnect") {
      log("Received disconnect command for WhatsApp worker.")
      void resetWhatsAppSession()
    }
  }, 2000).unref()
}

function enqueueMessage(row) {
  if (!row || !row.id) {
    return
  }

  if (row.status && row.status !== "pending") {
    return
  }

  if (seenMessageIds.has(row.id)) {
    return
  }

  seenMessageIds.add(row.id)
  queue.push(row)
  log(`Queued message ${row.id} for ${row.phone_number}. Queue size: ${queue.length}`)
  void processQueue()
}

async function updateQueueStatus(id, status, errorMessage = null) {
  const payload = {
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    error_message: status === "failed" ? String(errorMessage || "Failed to send through WhatsApp worker.") : null,
  }

  const { error } = await supabase.from(QUEUE_TABLE).update(payload).eq("id", id)

  if (error) {
    log(`Failed to update status for message ${id} to ${status}.`, error)
  }

  const { error: historyError } = await supabase
    .from("whatsapp_messages")
    .update(payload)
    .eq("id", id)

  if (historyError && historyError.code !== "42P01") {
    log(`Failed to mirror status to whatsapp_messages for ${id}.`, historyError)
  }
}

async function processQueue() {
  if (isProcessingQueue || !isWhatsappReady) {
    return
  }

  isProcessingQueue = true

  while (queue.length > 0 && isWhatsappReady) {
    const row = queue.shift()

    if (!row) {
      continue
    }

    try {
      const normalizedPhone = normalizePhoneNumber(row.phone_number)
      const phoneInfo = await whatsappClient.getNumberId(normalizedPhone)

      if (!phoneInfo || !phoneInfo._serialized) {
        throw new Error(`Phone number ${normalizedPhone} is not registered on WhatsApp.`)
      }

      const chatId = phoneInfo._serialized
      const outgoingMedia = buildOutgoingMedia(row)
      const trimmedMessage = String(row.message || "").trim()

      log(`Sending message ${row.id} to ${chatId}`)
      const sentMessage = outgoingMedia
        ? await whatsappClient.sendMessage(chatId, outgoingMedia, trimmedMessage ? { caption: trimmedMessage } : undefined)
        : await whatsappClient.sendMessage(chatId, trimmedMessage)
      await updateSentMessageMetadata(row.id, extractWhatsAppMessageId(sentMessage))
      await updateQueueStatus(row.id, "sent")
      sentMessagesSincePause += 1
      log(`Message ${row.id} sent successfully.`)
    } catch (error) {
      await updateQueueStatus(
        row.id,
        "failed",
        error instanceof Error ? error.message : String(error),
      )
      log(`Message ${row.id} failed.`, error)
    } finally {
      seenMessageIds.delete(row.id)
    }

    if (queue.length > 0 && sentMessagesSincePause > 0 && sentMessagesSincePause % BURST_SIZE === 0) {
      const burstPause = randomBurstPause()
      log(`Burst pause triggered after ${sentMessagesSincePause} sent message(s). Waiting ${burstPause}ms.`)
      await sleep(burstPause)
    }

    if (queue.length > 0) {
      const delay = randomDelay()
      log(`Waiting ${delay}ms before next message.`)
      await sleep(delay)
    }
  }

  isProcessingQueue = false
}

async function loadPendingMessages() {
  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select("id, phone_number, message, message_type, media_mime_type, media_base64, media_file_name, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  log(`Loaded ${data.length} pending message(s) from Supabase.`)

  for (const row of data) {
    enqueueMessage(row)
  }
}

async function pollPendingMessages() {
  if (!isWhatsappReady) {
    return
  }

  try {
    await loadPendingMessages()
  } catch (error) {
    log("Failed to poll pending WhatsApp messages.", error)
  }
}

async function skipPendingMessagesAfterReconnect() {
  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select("id")
    .eq("status", "pending")

  if (error) {
    throw error
  }

  if (!data.length) {
    return
  }

  const pendingIds = data
    .map((row) => row.id)
    .filter((value) => typeof value === "string" && value.trim().length > 0)

  if (!pendingIds.length) {
    return
  }

  const skippedAt = new Date().toISOString()
  const skipReason = "Skipped after WhatsApp reconnect; resend manually."

  const { error: queueError } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status: "failed",
      error_message: skipReason,
    })
    .in("id", pendingIds)

  if (queueError) {
    throw queueError
  }

  const { error: historyError } = await supabase
    .from(HISTORY_TABLE)
    .update({
      status: "failed",
      error_message: skipReason,
      sent_at: skippedAt,
    })
    .in("id", pendingIds)

  if (historyError) {
    throw historyError
  }

  log(`Skipped ${pendingIds.length} stale pending message(s) after reconnect.`)
}

function subscribeToQueueInserts() {
  const channel = supabase
    .channel("whatsapp-queue-worker")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: QUEUE_TABLE,
        filter: "status=eq.pending",
      },
      (payload) => {
        log(`Realtime insert received for message ${payload.new.id}.`)
        enqueueMessage(payload.new)
      }
    )
    .subscribe((status) => {
      log(`Realtime channel status: ${status}`)
    })

  return channel
}

async function bootstrap() {
  if (!acquireWorkerLock()) {
    process.exit(0)
    return
  }

  persistWorkerState({
    status: "starting",
    qrAvailable: fs.existsSync(QR_IMAGE_PATH),
    ready: false,
    authenticated: false,
    lastError: null,
  })

  setInterval(() => {
    persistWorkerState({ lastHeartbeatAt: new Date().toISOString() })
  }, HEARTBEAT_INTERVAL_MS).unref()

  setInterval(() => {
    void verifyWhatsAppConnection()
  }, CONNECTION_CHECK_INTERVAL_MS).unref()

  subscribeToCommands()

  whatsappClient.on("qr", async (qr) => {
    log("Scan the QR code below with WhatsApp on your phone:")
    qrcode.generate(qr, { small: true })

    try {
      await QRCode.toFile(QR_IMAGE_PATH, qr, {
        type: "png",
        margin: 2,
        width: 420,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
      log(`QR image saved to ${QR_IMAGE_PATH}`)
      persistWorkerState({
        status: "waiting_for_qr",
        qrAvailable: true,
        ready: false,
        authenticated: false,
        qrValue: qr,
        qrUpdatedAt: new Date().toISOString(),
        lastError: null,
      })
    } catch (error) {
      log("Failed to save QR image.", error)
      persistWorkerState({
        status: "waiting_for_qr",
        qrAvailable: false,
        ready: false,
        authenticated: false,
        qrValue: null,
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
  })

  whatsappClient.on("authenticated", () => {
    log("WhatsApp session authenticated.")
    persistWorkerState({
      status: "authenticating",
      authenticated: true,
      ready: false,
      lastError: null,
    })
  })

  whatsappClient.on("ready", async () => {
    isWhatsappReady = true
    log("WhatsApp client is ready.")
    removeQrImage()
    persistWorkerState({
      status: "connected",
      qrAvailable: false,
      ready: true,
      authenticated: true,
      qrValue: null,
      connectedAt: new Date().toISOString(),
      lastError: null,
    })

    try {
      await skipPendingMessagesAfterReconnect()
      await syncIncomingRepliesFromChats()
      await loadPendingMessages()
      await processQueue()
    } catch (error) {
      log("Failed to finalize pending messages after WhatsApp became ready.", error)
    }
  })

  const handlePotentialIncomingMessage = (message) => {
    void saveIncomingReply(message)
  }

  whatsappClient.on("message", handlePotentialIncomingMessage)
  whatsappClient.on("message_create", handlePotentialIncomingMessage)

  whatsappClient.on("auth_failure", (message) => {
    isWhatsappReady = false
    log(`WhatsApp authentication failed: ${message}`)
    persistWorkerState({
      status: "auth_failed",
      qrAvailable: fs.existsSync(QR_IMAGE_PATH),
      ready: false,
      authenticated: false,
      qrValue: null,
      authFailedAt: new Date().toISOString(),
      lastError: message,
    })

    if (!isResettingSession) {
      void resetWhatsAppSession()
    }
  })

  whatsappClient.on("disconnected", (reason) => {
    isWhatsappReady = false
    log(`WhatsApp disconnected: ${reason}`)
    persistWorkerState({
      status: "disconnected",
      qrAvailable: fs.existsSync(QR_IMAGE_PATH),
      ready: false,
      authenticated: false,
      qrValue: null,
      disconnectedAt: new Date().toISOString(),
      lastError: String(reason || "Disconnected"),
    })

    if (!isResettingSession) {
      void resetWhatsAppSession()
    }
  })

  setInterval(() => {
    void syncIncomingRepliesFromChats()
  }, INCOMING_SYNC_INTERVAL_MS).unref()

  setInterval(() => {
    void pollPendingMessages()
  }, QUEUE_POLL_INTERVAL_MS).unref()

  subscribeToQueueInserts()

  await whatsappClient.initialize()
}

bootstrap().catch((error) => {
  log("Worker crashed during startup.", error)
  releaseWorkerLock()
  process.exit(1)
})

process.on("SIGINT", async () => {
  log("SIGINT received, shutting down worker.")

  try {
    await whatsappClient.destroy()
  } finally {
    releaseWorkerLock()
    process.exit(0)
  }
})

process.on("SIGTERM", async () => {
  log("SIGTERM received, shutting down worker.")

  try {
    await whatsappClient.destroy()
  } finally {
    releaseWorkerLock()
    process.exit(0)
  }
})

process.on("exit", () => {
  releaseWorkerLock()
})