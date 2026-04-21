import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#E4A11B] to-[#E87722] rounded-full mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-[#1a2332] mb-4">سياسة الخصوصية</h1>
            <p className="text-xl text-[#1a2332]/70">كيف نحمي ونستخدم بياناتك الشخصية</p>
          </div>

          <Card className="border-2 border-[#E4A11B]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#E4A11B]/10 to-[#E87722]/10">
              <CardTitle className="text-2xl text-[#1a2332]">التزامنا بخصوصيتك</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-lg leading-relaxed text-[#1a2332]">
              <p>
                في مجمع الملك خالد، نحن ملتزمون بحماية خصوصيتك وأمان معلوماتك الشخصية. توضح هذه السياسة كيفية جمع
                واستخدام وحماية بياناتك.
              </p>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">1. المعلومات التي نجمعها</h3>
                <p>نقوم بجمع المعلومات التالية لتقديم خدماتنا بشكل أفضل:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>المعلومات الشخصية الأساسية (الاسم، رقم الطالب)</li>
                  <li>معلومات الحلقة والمستوى الدراسي</li>
                  <li>سجلات الحضور والتقدم في الحفظ</li>
                  <li>الإنجازات والنقاط المكتسبة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">2. كيف نستخدم معلوماتك</h3>
                <p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تقديم وتحسين خدماتنا التعليمية</li>
                  <li>متابعة تقدم الطلاب وتقييم أدائهم</li>
                  <li>التواصل مع الطلاب وأولياء الأمور</li>
                  <li>إنشاء تقارير وإحصائيات تعليمية</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">3. حماية البيانات</h3>
                <p>نتخذ إجراءات أمنية صارمة لحماية معلوماتك:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تشفير البيانات أثناء النقل والتخزين</li>
                  <li>الوصول المحدود للمعلومات الشخصية</li>
                  <li>مراجعة دورية للإجراءات الأمنية</li>
                  <li>نسخ احتياطي منتظم للبيانات</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">4. مشاركة المعلومات</h3>
                <p>نحن لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>بموافقتك الصريحة</li>
                  <li>لأغراض تعليمية مع المعلمين والإدارة</li>
                  <li>عند الطلب القانوني من الجهات المختصة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">5. حقوقك</h3>
                <p>لديك الحق في:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الوصول إلى معلوماتك الشخصية</li>
                  <li>طلب تصحيح أو تحديث بياناتك</li>
                  <li>طلب حذف معلوماتك (وفقاً للقوانين المعمول بها)</li>
                  <li>الاعتراض على معالجة بياناتك</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">6. الاتصال بنا</h3>
                <p>إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة "تواصل معنا".</p>
              </div>

              <div className="bg-gradient-to-r from-[#E4A11B]/10 to-[#E87722]/10 p-6 rounded-xl border-2 border-[#E4A11B]/20">
                <p className="font-semibold text-center">
                  آخر تحديث:{" "}
                  {new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
