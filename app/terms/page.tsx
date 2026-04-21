import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#E4A11B] to-[#E87722] rounded-full mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-[#1a2332] mb-4">شروط الخدمة</h1>
            <p className="text-xl text-[#1a2332]/70">الشروط والأحكام الخاصة باستخدام منصة مجمع الملك خالد</p>
          </div>

          <Card className="border-2 border-[#E4A11B]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#E4A11B]/10 to-[#E87722]/10">
              <CardTitle className="text-2xl text-[#1a2332]">مقدمة</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-lg leading-relaxed text-[#1a2332]">
              <p>
                مرحباً بكم في منصة مجمع الملك خالد. باستخدامك لهذه المنصة، فإنك توافق على الالتزام بالشروط والأحكام
                التالية. يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا.
              </p>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">1. استخدام المنصة</h3>
                <p>
                  تم تصميم هذه المنصة لخدمة طلاب مجمع الملك خالد لتحفيظ القرآن الكريم. يجب استخدام المنصة للأغراض
                  التعليمية والتربوية فقط.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">2. حقوق المستخدم</h3>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الوصول إلى المحتوى التعليمي والموارد المتاحة</li>
                  <li>متابعة التقدم الشخصي والإنجازات</li>
                  <li>التواصل مع المعلمين والإدارة</li>
                  <li>المشاركة في الأنشطة والبرامج المتاحة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">3. مسؤوليات المستخدم</h3>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الحفاظ على سرية معلومات تسجيل الدخول</li>
                  <li>استخدام المنصة بطريقة مسؤولة وأخلاقية</li>
                  <li>احترام حقوق الآخرين والمحتوى المنشور</li>
                  <li>الالتزام بالقواعد والتعليمات المقدمة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">4. الخصوصية والبيانات</h3>
                <p>
                  نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. لمزيد من المعلومات، يرجى الاطلاع على سياسة الخصوصية
                  الخاصة بنا.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-[#E4A11B]">5. التعديلات</h3>
                <p>
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر المنصة أو
                  البريد الإلكتروني.
                </p>
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
