# نشر الموقع الرابع على VPS مع Vercel

هذا الدليل يشغّل عامل واتساب للموقع الرابع على VPS مع إبقاء تطبيق Next.js نفسه على Vercel.

إذا كان `https://khalid9.vercel.app` يعمل أصلًا على Vercel، فلا تشغّل نسخة ثانية من التطبيق على نفس الـ VPS. المطلوب فقط أن يعمل `worker:whatsapp` بشكل دائم ويكتب حالته في نفس مشروع Supabase الذي يقرأ منه الموقع.

## البيانات الحالية

- `Vercel`: `https://khalid9.vercel.app`
- `Supabase project`: `xhfddytzyxplsuxdduqb`
- `VPS app path`: `/opt/khalid-app`
- `PM2 worker name`: `khalid-whatsapp-worker`

## 1. ملف البيئة

ابدأ من هذا القالب المحلي:

- `deploy/vps/site-4.env.example`

ثم انسخه على الخادم إلى:

```bash
/opt/khalid-app/.env.local
```

المهم هنا أن تكون القيم التالية خاصة بهذا الموقع فقط:

- `WHATSAPP_CLIENT_ID`
- `WHATSAPP_AUTH_DIR`
- `WHATSAPP_STATUS_FILE_PATH`
- `WHATSAPP_QR_IMAGE_PATH`
- `WHATSAPP_COMMAND_FILE_PATH`
- `WHATSAPP_LOCK_FILE_PATH`

هذه القيم هي التي تمنع مشاركة نفس جلسة واتساب مع أي موقع آخر على نفس الخادم.

## 2. تثبيت الحزم

على الـ VPS:

```bash
cd /opt/khalid-app
pnpm install
```

إذا كان Chromium غير موجود، ثبّته:

```bash
apt update
apt install -y chromium
```

## 3. تشغيل العامل عبر PM2

إذا لم تكن العملية موجودة:

```bash
cd /opt/khalid-app
pm2 start pnpm --name khalid-whatsapp-worker -- worker:whatsapp
pm2 save
```

إذا كانت العملية موجودة أصلًا وتحتاج فقط تحميل البيئة الجديدة أو الكود الجديد:

```bash
cd /opt/khalid-app
pm2 restart khalid-whatsapp-worker --update-env
```

## 4. التحقق

على الخادم:

```bash
pm2 describe khalid-whatsapp-worker
pm2 logs khalid-whatsapp-worker --lines 100
```

ومن الخارج:

```bash
curl https://khalid9.vercel.app/api/whatsapp/status
curl -I https://khalid9.vercel.app/api/whatsapp/qr
```

المتوقع عند نجاح التشغيل:

- `workerOnline: true`
- `status: waiting_for_qr` أو `connected`
- مسار `/api/whatsapp/qr` يرجع `200` عندما يوجد `qrValue`

## 5. ملاحظات العزل

- لا تستخدم نفس مشروع Supabase الخاص بموقع Habib إذا كنت تريد عزلًا كاملًا بين الموقعين.
- لا تعِد استخدام نفس `WHATSAPP_CLIENT_ID` أو نفس ملفات الجلسة.
- هذا المستودع يدعم الآن إنشاء أسماء وملفات افتراضية مختلفة بحسب `WHATSAPP_CLIENT_ID` أو مشروع Supabase حتى لو كانت البيئة ناقصة.