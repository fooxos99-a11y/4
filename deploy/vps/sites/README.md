# VPS Site Folders

This directory contains the four local site folders that map to the four cloned Supabase projects.

## Folder map

- `site-1` -> `xxwhasnyoswvbfwtjrbv` -> `https://xxwhasnyoswvbfwtjrbv.supabase.co` -> port `3001`
- `site-2` -> `sgryywvaksyzaoujeeoy` -> `https://sgryywvaksyzaoujeeoy.supabase.co` -> port `3002`
- `site-3` -> `mdunfxlyrpqgpukimrgq` -> `https://mdunfxlyrpqgpukimrgq.supabase.co` -> port `3003`
- `site-4` -> `xhfddytzyxplsuxdduqb` -> `https://xhfddytzyxplsuxdduqb.supabase.co` -> port `3004`

## Files

Each site folder contains one file:

- `site.env`

That file is the full runtime environment for both the Next.js app and the WhatsApp worker of that site.

## Important

- Fill the `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` values from the matching Supabase project.
- Keep `SUPABASE_ANON_KEY` equal to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Use a different `AUTH_SESSION_SECRET` and `CRON_SECRET` for each site.
- Do not reuse `WHATSAPP_AUTH_DIR`, `WHATSAPP_STATUS_FILE_PATH`, or `WHATSAPP_CLIENT_ID` between sites.
- These `site.env` files are ignored by git through `.gitignore`.
