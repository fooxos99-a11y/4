# 📱 دليل ربط الموقع مع WhatsApp Cloud API

## 📋 نظرة عامة

هذا الدليل يشرح كيفية إعداد وتشغيل نظام WhatsApp Cloud API للموقع، والذي يوفر:
1. **إرسال رسائل واتساب** من الموقع إلى العملاء
2. **استقبال ردود العملاء** داخل الموقع عبر Webhook

---

## 🔧 المتطلبات الأساسية

### 1. حساب Meta Business
- تسجيل في [Meta for Developers](https://developers.facebook.com/)
- إنشاء تطبيق (App) من نوع "Business"
- تفعيل WhatsApp API

### 2. معلومات API المطلوبة
بعد إعداد WhatsApp API، ستحصل على:
- ✅ **Phone Number ID** - معرف رقم الهاتف
- ✅ **Access Token** - مفتاح الوصول (يبدأ بـ `EAAE...`)
- ✅ **Verify Token** - توكن التحقق (تختاره أنت)

---

## 📁 هيكل الملفات المُنشأة

```
app/
├── api/
│   └── whatsapp/
│       ├── send/
│       │   └── route.ts          # إرسال الرسائل
│       ├── webhook/
│       │   └── route.ts          # استقبال الردود والتحديثات
│       ├── replies/
│       │   └── route.ts          # إدارة الردود
│       └── stats/
│           └── route.ts          # إحصائيات الرسائل
scripts/
└── 017_create_whatsapp_tables.sql  # جداول قاعدة البيانات
.env.local.example                   # مثال لملف المتغيرات البيئية
```

---

## ⚙️ خطوات الإعداد

### الخطوة 1: إعداد قاعدة البيانات

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. نفّذ محتوى ملف `scripts/017_create_whatsapp_tables.sql`
4. تأكد من إنشاء الجداول بنجاح:
   - `whatsapp_messages` - الرسائل المرسلة
   - `whatsapp_replies` - الردود المستلمة

### الخطوة 2: إعداد المتغيرات البيئية

1. انسخ `.env.local.example` إلى `.env.local`
2. املأ البيانات:

```env
# WhatsApp Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAExxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=my_secret_verify_token_12345
WHATSAPP_API_VERSION=v19.0

# Database (موجود مسبقاً)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### الخطوة 3: إعداد Webhook في Meta

1. اذهب إلى [Meta App Dashboard](https://developers.facebook.com/apps)
2. اختر تطبيقك → WhatsApp → Configuration
3. في قسم **Webhook**:
   - **Callback URL**: `https://yourwebsite.com/api/whatsapp/webhook`
   - **Verify Token**: نفس قيمة `WHATSAPP_VERIFY_TOKEN`
4. اشترك في الأحداث التالية:
   - ✅ `messages` - الرسائل الواردة
   - ✅ `message_status` - تحديثات الحالة

### الخطوة 4: اختبار الاتصال

```bash
# تشغيل السيرفر
npm run dev

# اختبار Webhook Verification (في متصفح جديد)
https://yourwebsite.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_secret_verify_token_12345&hub.challenge=test123
# يجب أن يعيد: test123
```

---

## 🚀 كيفية الاستخدام

### 1. إرسال رسالة واتساب

#### من الكود:
```typescript
const response = await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+966501234567', // مع أو بدون +
    message: 'مرحباً بك في موقعنا!',
    userId: 'uuid-of-current-user' // اختياري
  })
});

const data = await response.json();
console.log(data); // { success: true, messageId: "wamid.xxx" }
```

#### من cURL (للاختبار):
```bash
curl -X POST https://yourwebsite.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "966501234567",
    "message": "رسالة تجريبية"
  }'
```

### 2. جلب الرسائل المرسلة

```typescript
const response = await fetch('/api/whatsapp/send');
const { messages } = await response.json();

messages.forEach(msg => {
  console.log(`${msg.phone_number}: ${msg.message_text} [${msg.status}]`);
});
```

### 3. جلب الردود المستلمة

```typescript
// جميع الردود
const response = await fetch('/api/whatsapp/replies');
const { replies } = await response.json();

// الردود غير المقروءة فقط
const response = await fetch('/api/whatsapp/replies?unread_only=true');
const { replies } = await response.json();
```

### 4. تحديث حالة قراءة الرد

```typescript
await fetch('/api/whatsapp/replies', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    replyId: 'uuid-of-reply',
    isRead: true
  })
});
```

### 5. جلب الإحصائيات

```typescript
const response = await fetch('/api/whatsapp/stats');
const { stats } = await response.json();

console.log(`إجمالي الرسائل: ${stats.total_sent}`);
console.log(`الردود غير المقروءة: ${stats.unread_replies}`);
```

---

## 📊 هيكل البيانات

### جدول `whatsapp_messages` (الرسائل المرسلة)

```typescript
{
  id: UUID,
  phone_number: string,        // "966501234567"
  message_text: string,         // محتوى الرسالة
  status: string,               // "pending" | "sent" | "delivered" | "read" | "failed"
  message_id: string | null,    // "wamid.HBgNOTY2NTQ..."
  error_message: string | null, // رسالة الخطأ إن وجدت
  sent_by: UUID | null,         // معرف المستخدم المرسل
  sent_at: timestamp,
  created_at: timestamp
}
```

### جدول `whatsapp_replies` (الردود المستلمة)

```typescript
{
  id: UUID,
  from_phone: string,           // "966501234567"
  message_text: string,         // محتوى الرد
  message_id: string,           // "wamid.HBgNOTY2NTQ..." (فريد)
  timestamp: number,            // Unix timestamp
  is_read: boolean,             // true | false
  original_message_id: UUID | null, // ربط بالرسالة الأصلية
  received_at: timestamp,
  created_at: timestamp
}
```

---

## 🔐 الأمان والصلاحيات

### Row Level Security (RLS)
- ✅ **الإداريون فقط** يمكنهم مشاهدة وإرسال الرسائل
- ✅ **Service Role** يمكنه إضافة الردود (للـ webhook)
- ✅ جميع الجداول محمية بـ RLS

### التحقق من Webhook
- يتم التحقق من `WHATSAPP_VERIFY_TOKEN` عند التسجيل
- WhatsApp تستخدم HTTPS فقط
- يجب أن يكون الموقع على دومين حقيقي (ليس localhost)

---

## 🐛 استكشاف الأخطاء

### 1. Webhook لا يعمل
```bash
# تحقق من اللوقات
console.log في webhook/route.ts

# تأكد من Verify Token صحيح
WHATSAPP_VERIFY_TOKEN في .env.local === Verify Token في Meta Dashboard

# تأكد من الـ URL صحيح
https://yourwebsite.com/api/whatsapp/webhook (بدون / في النهاية)
```

### 2. فشل إرسال الرسالة
```typescript
// تحقق من:
✅ WHATSAPP_PHONE_NUMBER_ID صحيح
✅ WHATSAPP_ACCESS_TOKEN صالح (لم ينتهي)
✅ رقم الهاتف مسجل في WhatsApp
✅ رقم الهاتف بتنسيق دولي (966501234567)
```

### 3. لا تصل الردود
```bash
# تحقق من Webhook Subscriptions في Meta
✅ messages
✅ message_status

# تحقق من Callback URL
✅ HTTPS (مطلوب)
✅ يعيد status 200
✅ يرد خلال 20 ثانية
```

### 4. أخطاء في قاعدة البيانات
```sql
-- تحقق من RLS Policies
SELECT * FROM pg_policies WHERE tablename = 'whatsapp_messages';

-- تحقق من الصلاحيات
SELECT * FROM information_schema.table_privileges 
WHERE table_name IN ('whatsapp_messages', 'whatsapp_replies');
```

---

## 📝 ملاحظات مهمة

### 1. حدود WhatsApp API
- **24 ساعة**: لديك 24 ساعة للرد على رسالة العميل
- **Template Messages**: بعد 24 ساعة، يجب استخدام رسائل معتمدة
- **Rate Limits**: حد معين لعدد الرسائل في الدقيقة
- **Quality Rating**: حافظ على جودة عالية لتجنب الحظر

### 2. أنواع الرسائل المدعومة
- ✅ نص (Text)
- ✅ صورة (Image) + caption
- ✅ فيديو (Video) + caption
- ✅ مستند (Document)
- ✅ موقع (Location)
- ✅ صوت (Audio)

### 3. تنسيق الأرقام
```typescript
// ✅ صحيح
"966501234567"
"+966501234567"
"966 50 123 4567"

// ❌ خطأ
"0501234567"  // بدون كود الدولة
"(+966) 501234567"  // أحرف خاصة
```

### 4. الـ Webhook يحتاج:
- ✅ HTTPS (SSL Certificate)
- ✅ دومين عام (ليس localhost)
- ✅ رد سريع (< 20 ثانية)
- ✅ status 200 دائماً

---

## 📚 موارد إضافية

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform](https://business.whatsapp.com/)
- [Meta for Developers](https://developers.facebook.com/)
- [Supabase Docs](https://supabase.com/docs)

---

## 🔄 التحديثات المستقبلية

### يمكن إضافة:
- [ ] دعم Template Messages
- [ ] إرسال صور ومستندات
- [ ] نظام الردود السريعة (Quick Replies)
- [ ] إرسال دفعات (Bulk Messages)
- [ ] جدولة الرسائل
- [ ] تقارير متقدمة
- [ ] دعم WhatsApp Business API

---

## ✅ Checklist للمبرمج

قبل البدء:
- [ ] تم تنفيذ SQL script في Supabase
- [ ] تم إعداد ملف `.env.local` بجميع المتغيرات
- [ ] تم التأكد من صلاحيات قاعدة البيانات
- [ ] تم إعداد Webhook في Meta Dashboard
- [ ] تم اختبار Webhook Verification
- [ ] تم إرسال رسالة تجريبية بنجاح
- [ ] تم استقبال رد تجريبي بنجاح

---

## 📞 الدعم

في حالة وجود مشاكل:
1. تحقق من اللوقات في terminal
2. تحقق من Network tab في المتصفح
3. تحقق من Activity Log في Meta Dashboard
4. راجع قسم "استكشاف الأخطاء" أعلاه

---

**تم إعداد هذا النظام بواسطة GitHub Copilot**
**التاريخ: 5 ديسمبر 2025**
