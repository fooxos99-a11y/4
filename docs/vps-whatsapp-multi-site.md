# تشغيل واتساب و QR لكل موقع على حدة عبر VPS

هذا المشروع يفصل جلسة واتساب لكل موقع من خلال متغيرات البيئة التالية:

- `NEXT_PUBLIC_SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_CLIENT_ID`
- `WHATSAPP_AUTH_DIR`
- `WHATSAPP_STATUS_FILE_PATH`
- `WHATSAPP_QR_IMAGE_PATH`
- `WHATSAPP_COMMAND_FILE_PATH`
- `WHATSAPP_LOCK_FILE_PATH`

طالما أن كل موقع يعمل بملف env مختلف، فسيكون له:

- قاعدة Supabase مستقلة
- جلسة واتساب مستقلة
- QR مستقل
- ملف حالة مستقل

## 1. تجهيز VPS

ثبت المتطلبات:

```bash
sudo apt update
sudo apt install -y nginx chromium-browser
curl -fsSL https://get.pnpm.io/install.sh | sh -
npm install -g pm2
```

ثم داخل المشروع:

```bash
pnpm install
pnpm build
chmod +x ./scripts/vps/run-site.sh
```

## 2. إنشاء ملفات البيئة لكل موقع

تم تجهيز 4 مجلدات محلية داخل المشروع، وكل مجلد يحتوي على ملف env كامل وواضح:

```bash
deploy/vps/sites/site-1/site.env
deploy/vps/sites/site-2/site.env
deploy/vps/sites/site-3/site.env
deploy/vps/sites/site-4/site.env
```

الربط الحالي هو:

- `site-1` -> `xxwhasnyoswvbfwtjrbv` -> البورت `3001`
- `site-2` -> `sgryywvaksyzaoujeeoy` -> البورت `3002`
- `site-3` -> `mdunfxlyrpqgpukimrgq` -> البورت `3003`
- `site-4` -> `xhfddytzyxplsuxdduqb` -> البورت `3004`

مهم:

- لا تجعل موقعين يشتركان في نفس `WHATSAPP_AUTH_DIR`
- لا تجعل موقعين يشتركان في نفس `WHATSAPP_STATUS_FILE_PATH`
- يجب أن يكون `WHATSAPP_CLIENT_ID` مختلفًا لكل موقع
- كل app يجب أن يقرأ نفس env الخاص بالworker المقابل له

## 3. تشغيل المواقع والواتساب عبر PM2

ملف [ecosystem.vps.config.cjs](../ecosystem.vps.config.cjs) يشغل 8 عمليات:

- 4 تطبيقات Next.js
- 4 عمال WhatsApp

التشغيل:

```bash
pm2 start ecosystem.vps.config.cjs
pm2 save
pm2 status
```

أسماء العمليات:

- `habib-site1-app`
- `habib-site1-worker`
- `habib-site2-app`
- `habib-site2-worker`
- `habib-site3-app`
- `habib-site3-worker`
- `habib-site4-app`
- `habib-site4-worker`

## 4. الوصول إلى QR لكل موقع

بعد ربط كل دومين أو بورت بالموقع الصحيح، سيكون QR لكل موقع على نفس عنوانه:

- `https://site1.example.com/api/whatsapp/qr`
- `https://site2.example.com/api/whatsapp/qr`
- `https://site3.example.com/api/whatsapp/qr`
- `https://site4.example.com/api/whatsapp/qr`

وحالة العامل:

- `https://site1.example.com/api/whatsapp/status`
- `https://site2.example.com/api/whatsapp/status`
- `https://site3.example.com/api/whatsapp/status`
- `https://site4.example.com/api/whatsapp/status`

إذا كنت تستخدم بورتات مباشرة بدل الدومينات فسيكون المثال:

- `http://127.0.0.1:3001/api/whatsapp/qr`
- `http://127.0.0.1:3002/api/whatsapp/qr`
- `http://127.0.0.1:3003/api/whatsapp/qr`
- `http://127.0.0.1:3004/api/whatsapp/qr`

## 5. إدارة كل موقع بشكل مستقل

إعادة تشغيل موقع واحد فقط:

```bash
pm2 restart habib-site1-app
pm2 restart habib-site1-worker
```

مشاهدة السجلات:

```bash
pm2 logs habib-site1-worker
pm2 logs habib-site2-worker
pm2 logs habib-site3-worker
pm2 logs habib-site4-worker
```

## 6. مثال Nginx

كل دومين يوجه إلى بورت موقعه:

```nginx
server {
  server_name site1.example.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection upgrade;
  }
}
```

كرر نفس الفكرة للمواقع الثاني والثالث والرابع مع البورت المناسب.

## 7. النتيجة المتوقعة

بهذا الترتيب سيكون لكل موقع على الـ VPS:

- تطبيق مستقل
- Worker مستقل
- QR مستقل
- جلسة واتساب مستقلة بالكامل

إذا نقلت نفس الكود لنفس الـ VPS فلا تحتاج لتكرار المستودع 4 مرات. يكفي تشغيل 4 app instances و4 worker instances بملفات env مختلفة.