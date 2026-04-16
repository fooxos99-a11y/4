# Vercel Environment Files

This folder contains tracked Vercel environment examples.

Files:

- `site-4.env.example`

Notes:

- `deploy/vercel/*.env` is ignored by git, so committed examples should use names like `*.env.example`.
- Copy the values into the Vercel dashboard rather than expecting these files to be deployed automatically.
- If your app already works on Vercel, keep using the same Supabase project and the same `WHATSAPP_WORKER_STATE_SETTING_ID` / `WHATSAPP_WORKER_COMMAND_SETTING_ID` values when you add the VPS worker.

Important:

- These files are for the Next.js app running on Vercel.
- The current `whatsapp-web.js` worker is not suitable for Vercel because it needs a persistent browser session and persistent local files.
- Keep the worker-specific variables on the VPS, not on Vercel.
- The app on Vercel must still use the same `WHATSAPP_WORKER_STATE_SETTING_ID`, `WHATSAPP_WORKER_COMMAND_SETTING_ID`, and WhatsApp table names as its matching VPS worker.
- The `WHATSAPP_*` Cloud API variables below are still valid on Vercel for webhook/API usage.

VPS-only variables not included here:

- `APP_PORT`
- `WHATSAPP_CLIENT_ID`
- `WHATSAPP_AUTH_DIR`
- `WHATSAPP_STATUS_FILE_PATH`
- `WHATSAPP_QR_IMAGE_PATH`
- `WHATSAPP_COMMAND_FILE_PATH`
- `WHATSAPP_LOCK_FILE_PATH`
- `WHATSAPP_MIN_DELAY_MS`
- `WHATSAPP_MAX_DELAY_MS`
- `WHATSAPP_BURST_SIZE`
- `WHATSAPP_BURST_PAUSE_MIN_MS`
- `WHATSAPP_BURST_PAUSE_MAX_MS`
- `WHATSAPP_INCOMING_SYNC_INTERVAL_MS`
- `WHATSAPP_INCOMING_SYNC_CHAT_LIMIT`
- `WHATSAPP_INCOMING_SYNC_MESSAGE_LIMIT`
- `WHATSAPP_HEARTBEAT_INTERVAL_MS`
- `WHATSAPP_QUEUE_POLL_INTERVAL_MS`
- `PUPPETEER_EXECUTABLE_PATH`

Shared between Vercel and VPS for each site:

- `WHATSAPP_WORKER_STATE_SETTING_ID`
- `WHATSAPP_WORKER_COMMAND_SETTING_ID`
- `WHATSAPP_QUEUE_TABLE`
- `WHATSAPP_HISTORY_TABLE`
- `WHATSAPP_REPLIES_TABLE`

Missing values:

- `site-4.env.example` is a safe template. Replace placeholders with the exact values already configured in Vercel.