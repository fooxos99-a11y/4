import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t-4 border-[#3453a7] bg-white pt-16 pb-8 text-[#1a2332]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-2xl font-bold mb-6 text-[#3453a7]">من نحن</h3>
            <p className="text-base leading-relaxed text-[#1f2937]">
              مجمع الملك خالد لتحفيظ القرآن الكريم، يسعى لتقديم بيئة تربوية متميزة تجمع بين الأصالة والمعاصرة.
              نهدف إلى تخريج جيل قرآني متقن لكتاب الله، ملتزم بتعاليمه، قادر على خدمة دينه ومجتمعه. مع التركيز على
              الجودة والإتقان والمتابعة المستمرة لكل طالب.
            </p>
          </div>

          <div className="flex justify-start md:justify-center">
            <div>
              <h3 className="text-xl font-bold mb-6 text-[#3453a7] text-right md:text-center">روابط سريعة</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-[#111827] hover:text-[#3453a7] transition-colors">
                    الرئيسية
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[#111827] hover:text-[#3453a7] transition-colors">
                    شروط الخدمة
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-[#111827] hover:text-[#3453a7] transition-colors">
                    سياسة الخصوصية
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-[#111827] hover:text-[#3453a7] transition-colors">
                    اتصل بنا
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 text-[#3453a7]">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-[#1f2937]">
                <Phone className="w-5 h-5 text-[#3453a7]" />
                <span>789 456 123+</span>
              </li>
              <li className="flex items-center gap-3 text-[#1f2937]">
                <Mail className="w-5 h-5 text-[#3453a7]" />
                <span>info@example.com</span>
              </li>
              <li className="flex items-center gap-3 text-[#1f2937]">
                <MapPin className="w-5 h-5 text-[#3453a7]" />
                <span>السعودية، بريدة</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
