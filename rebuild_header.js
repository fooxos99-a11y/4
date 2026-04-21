const fs = require("fs");

const newContent = `"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  LogOut,
  Users,
  LayoutDashboard,
  Menu,
  ClipboardCheck,
  Trophy,
  Store,
  Map,
  Target,
  MessageSquare,
  Home,
  Gamepad2,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal";

interface Circle {
  name: string;
  studentCount: number;
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000;

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState<{
    id: string;
    name: string;
    accountNumber: number;
  } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const adminRoles = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"];
  const isAdmin = adminRoles.includes(userRole || "");

  const router = useRouter();
  const confirmDialog = useConfirmDialog();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    if (loggedIn && role === "teacher") {
      const accNum = localStorage.getItem("accountNumber");
      if (accNum) fetchTeacherInfo(accNum);
    }
    loadCircles();
  }, []);

  const loadCircles = () => {
    const cachedData = localStorage.getItem("circlesCache");
    const cacheTime = localStorage.getItem("circlesCacheTime");
    if (cachedData && cacheTime && Date.now() - Number(cacheTime) < CIRCLES_CACHE_DURATION) {
      setCircles(JSON.parse(cachedData));
      setCirclesLoading(false);
    } else {
      fetchCircles();
    }
  };

  const fetchCircles = async () => {
    try {
      setCirclesLoading(true);
      const res = await fetch("/api/circles");
      const data = await res.json();
      if (data.circles) {
        setCircles(data.circles);
        localStorage.setItem("circlesCache", JSON.stringify(data.circles));
        localStorage.setItem("circlesCacheTime", Date.now().toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCirclesLoading(false);
    }
  };

  const fetchTeacherInfo = async (accNum: string) => {
    try {
      const res = await fetch(\`/api/teachers?account_number=\${accNum}\`);
      const data = await res.json();
      if (data.teachers?.[0]) {
        setTeacherInfo({
          id: data.teachers[0].id,
          name: data.teachers[0].name,
          accountNumber: data.teachers[0].account_number,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "تأكيد تسجيل الخروج",
      description: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",
      confirmText: "نعم، تسجيل الخروج",
      cancelText: "إلغاء",
    });
    if (confirmed) {
      setIsLoggingOut(true);
      await new Promise((r) => setTimeout(r, 800));
      localStorage.clear();
      setIsLoggedIn(false);
      setUserRole(null);
      setIsLoggingOut(false);
      router.push("/");
    }
  };

  const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    router.push(href);
  };

  const goToProfile = () => {
    if (isAdmin) router.push("/admin/profile");
    else if (userRole === "teacher") router.push("/teacher/dashboard");
    else router.push("/profile");
    scrollToTop();
  };

  return (
    <>
      {isLoggedIn && userRole === "teacher" && teacherInfo && (
        <TeacherAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          teacherId={teacherInfo.id}
          teacherName={teacherInfo.name}
          accountNumber={teacherInfo.accountNumber}
        />
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-[#d8a355]/20 border-t-[#d8a355] rounded-full animate-spin" />
            <p className="font-bold text-[#d8a355] text-lg">جاري تسجيل الخروج...</p>
          </div>
        </div>
      )}

      <header className="bg-[#00312e] text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-20 flex items-center relative">
          {/* زر الثلاث خطوط - يمين */}
          <button
            className="flex p-2 z-20 mr-auto"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={32} />
          </button>

          {/* اللوقو - وسط */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 flex justify-center">
            <Image
              src="/قبس.png"
              alt="قبس"
              width={100}
              height={60}
              className="w-20 md:w-24 h-auto cursor-pointer"
              onClick={() => handleNav("/")}
            />
          </div>
        </div>

        {/* خلفية مظللة */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* القائمة الجانبية */}
        <div
          className={\`fixed top-0 right-0 h-full w-72 sm:w-80 bg-white text-[#00312e] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col \${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}\`}
        >
          {/* رأس الدرج */}
          <div className="h-20 px-4 flex items-center border-b border-gray-100 bg-[#00312e] text-white relative w-full">
            {/* زر إغلاق - يسار */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex p-2 z-20 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu size={32} />
            </button>
            {/* لوقو في المنتصف */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex justify-center w-full pointer-events-none">
              <Image
                src="/قبس.png"
                alt="قبس"
                width={60}
                height={35}
                className="w-16 h-auto cursor-pointer pointer-events-auto"
                onClick={() => handleNav("/")}
              />
            </div>
          </div>

          {/* المحتوى */}
          <div className="flex-1 overflow-y-auto pb-10">
            <nav className="flex flex-col">

              {/* قسم الحساب */}
              {isLoggedIn ? (
                <div className="flex flex-col border-b border-gray-100">
                  <button
                    onClick={goToProfile}
                    className="py-4 px-4 hover:bg-[#f5f1e8] transition-colors flex items-center gap-3 font-bold text-sm"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#d8a355] flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-[#00312e]" />
                    </div>
                    <span>الملف الشخصي</span>
                  </button>
                  {userRole === "teacher" && (
                    <>
                      <button
                        onClick={() => handleNav("/teacher/halaqah/1")}
                        className="py-4 border-t border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
                      >
                        <Users size={18} /> <span>إدارة الحلقة</span>
                      </button>
                      <button
                        onClick={() => { setIsAttendanceModalOpen(true); setIsMobileMenuOpen(false); }}
                        className="py-4 border-t border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
                      >
                        <ClipboardCheck size={18} /> <span>تحضير</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-4 border-b border-gray-100">
                  <Button
                    onClick={() => handleNav("/login")}
                    className="w-full bg-[#d8a355] hover:bg-[#c99347] text-[#00312e] font-extrabold rounded-md h-10"
                  >
                    دخول
                  </Button>
                </div>
              )}

              {/* روابط التنقل */}
              <button
                onClick={() => handleNav("/")}
                className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
              >
                <Home size={18} /> <span>الرئيسية</span>
              </button>

              <button
                onClick={() => handleNav("/achievements")}
                className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
              >
                <Trophy size={18} /> <span>الإنجازات</span>
              </button>

              {isLoggedIn && (userRole === "teacher" || isAdmin) && (
                <button
                  onClick={() => handleNav("/competitions")}
                  className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
                >
                  <Gamepad2 size={18} /> <span>المسابقات</span>
                </button>
              )}

              {isLoggedIn && userRole === "student" && (
                <>
                  <button
                    onClick={() => handleNav("/pathways")}
                    className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
                  >
                    <Map size={18} /> <span>المسار</span>
                  </button>
                  <button
                    onClick={() => handleNav("/daily-challenge")}
                    className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 text-[#d8a355] font-bold text-sm"
                  >
                    <Target size={18} /> <span>التحدي اليومي</span>
                  </button>
                  <button
                    onClick={() => handleNav("/store")}
                    className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
                  >
                    <Store size={18} /> <span>المتجر</span>
                  </button>
                </>
              )}

              <button
                onClick={() => handleNav("/contact")}
                className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-bold text-sm"
              >
                <MessageSquare size={18} /> <span>تواصل معنا</span>
              </button>

              {isLoggedIn && isAdmin && (
                <button
                  onClick={() => handleNav("/admin/dashboard")}
                  className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center gap-3 font-extrabold text-[#d8a355] text-sm"
                >
                  <LayoutDashboard size={20} /> <span>لوحة التحكم للإدارة</span>
                </button>
              )}

              {/* أفضل الطلاب / الحلقات - قابل للطي */}
              <button
                onClick={() => setIsStudentsOpen(!isStudentsOpen)}
                className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-4 transition-colors flex items-center justify-between font-bold text-sm w-full"
              >
                <ChevronDown
                  size={18}
                  className={\`transition-transform duration-200 \${isStudentsOpen ? "rotate-180" : ""}\`}
                />
                <span className="flex items-center gap-3">
                  <Star size={18} /> أفضل الطلاب / الحلقات
                </span>
              </button>

              {isStudentsOpen && (
                <div className="flex flex-col border-b border-gray-100 bg-gray-50">
                  <button
                    onClick={() => handleNav("/students/all")}
                    className="py-3 px-8 hover:bg-[#f5f1e8] transition-colors flex items-center gap-3 font-bold text-sm border-b border-gray-100"
                  >
                    <Users size={16} /> <span>جميع الطلاب</span>
                  </button>
                  {circlesLoading ? (
                    <p className="py-3 px-8 text-sm text-gray-400">جاري التحميل...</p>
                  ) : (
                    circles.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => handleNav(\`/halaqat/\${c.name}\`)}
                        className="py-3 px-8 hover:bg-[#f5f1e8] transition-colors flex items-center gap-3 font-bold text-sm border-b border-gray-100"
                      >
                        <span>{c.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* تسجيل الخروج */}
              {isLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="py-4 px-4 hover:bg-red-50 transition-colors flex items-center gap-3 font-bold text-sm text-red-600 mt-2"
                >
                  <LogOut size={18} /> <span>تسجيل الخروج</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
`;

fs.writeFileSync("components/header.tsx", newContent);
console.log("Done");
