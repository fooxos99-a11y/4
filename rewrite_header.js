const fs = require("fs");
const content = `"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  LogOut,
  Users,
  LayoutDashboard,
  Menu,
  X,
  ClipboardCheck,
  Trophy,
  Store,
  Map,
  Target,
  MessageSquare,
  Home,
  Gamepad2,
  Star,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Settings,
  FileText,
  Award,
  Edit2,
  BookOpen,
  ShieldCheck,
  Zap,
  Bell,
  Send,
  ShoppingBag,
  Phone,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Circle {
  name: string;
  studentCount: number;
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000;

function NavItem({
  icon: Icon,
  label,
  onClick,
  gold,
  indent,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  gold?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={\`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-all duration-150 group border-b border-[#00312e]/8 relative
        \${indent ? "pr-10" : ""}
        \${gold ? "text-[#d8a355] hover:bg-[#d8a355]/10" : "text-[#1a2e2b] hover:bg-[#00312e]/5"}\`}
    >
      <span
        className={\`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
          \${gold ? "bg-[#d8a355]/15 text-[#d8a355] group-hover:bg-[#d8a355]/25" : "bg-[#00312e]/8 text-[#00312e] group-hover:bg-[#00312e]/15"}\`}
      >
        <Icon size={16} />
      </span>
      <span className="flex-1 text-right">{label}</span>
      <ChevronLeft size={14} className="opacity-30 group-hover:opacity-60 flex-shrink-0" />
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 pt-5 pb-2">
      <p className="text-[10px] font-bold tracking-widest text-[#00312e]/40 uppercase">{title}</p>
    </div>
  );
}

function CollapseSection({
  icon: Icon,
  label,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-all duration-150 border-b border-[#00312e]/8 text-[#1a2e2b] hover:bg-[#00312e]/5"
      >
        <span className="w-8 h-8 rounded-lg bg-[#00312e]/8 text-[#00312e] flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </span>
        <span className="flex-1 text-right">{label}</span>
        <ChevronDown
          size={15}
          className={\`flex-shrink-0 transition-transform duration-200 opacity-50 \${isOpen ? "rotate-180" : ""}\`}
        />
      </button>
      {isOpen && (
        <div className="bg-[#00312e]/[0.025] border-b border-[#00312e]/8">{children}</div>
      )}
    </>
  );
}

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
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
  const [isAdminStudentsOpen, setIsAdminStudentsOpen] = useState(false);
  const [isAdminReportsOpen, setIsAdminReportsOpen] = useState(false);
  const [isAdminCommOpen, setIsAdminCommOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const adminRoles = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"];
  const isAdmin = adminRoles.includes(userRole || "");
  const router = useRouter();
  const confirmDialog = useConfirmDialog();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setUserName(name);
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
        setTeacherInfo({ id: data.teachers[0].id, name: data.teachers[0].name, accountNumber: data.teachers[0].account_number });
      }
    } catch (e) { console.error(e); }
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

  const roleLabel = isAdmin ? "مشرف" : userRole === "teacher" ? "معلم" : userRole === "student" ? "طالب" : "";

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
        <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors z-20"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={26} />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
            <Image src="/قبس.png" alt="قبس" width={100} height={60} className="w-20 md:w-24 h-auto cursor-pointer" onClick={() => handleNav("/")} />
          </div>

          <div className="z-20">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#d8a355] flex items-center justify-center ring-2 ring-offset-2 ring-offset-[#00312e] ring-[#d8a355]/60 hover:scale-105 transition-transform">
                    <User className="text-[#00312e]" size={22} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 p-2">
                  <DropdownMenuItem onClick={goToProfile} className="py-3 gap-2 cursor-pointer font-bold">
                    <User size={18} /> الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {userRole === "teacher" && (
                    <>
                      <DropdownMenuItem onClick={() => handleNav("/teacher/halaqah/1")} className="py-3 gap-2 cursor-pointer text-slate-600">
                        <Users size={18} /> إدارة الحلقة
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsAttendanceModalOpen(true)} className="py-3 gap-2 cursor-pointer text-slate-600">
                        <ClipboardCheck size={18} /> تحضير
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="py-3 gap-2 text-red-600 focus:bg-red-50 cursor-pointer font-bold">
                    <LogOut size={18} /> تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => handleNav("/login")} className="bg-[#d8a355] hover:bg-[#c99347] text-[#00312e] font-extrabold rounded-lg px-5 h-9 text-sm">
                دخول
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* خلفية مظللة */}
      <div
        className={\`fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm transition-opacity duration-300 \${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}\`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* الدرج الجانبي */}
      <div
        dir="rtl"
        className={\`fixed top-0 right-0 h-full w-[300px] bg-white z-[90] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out \${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}\`}
      >
        {/* رأس الدرج */}
        <div className="bg-[#00312e] px-5 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <Image src="/قبس.png" alt="قبس" width={80} height={45} className="h-10 w-auto cursor-pointer" onClick={() => handleNav("/")} />
            <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={18} className="text-white" />
            </button>
          </div>

          {isLoggedIn ? (
            <button onClick={goToProfile} className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-3 text-right">
              <div className="w-10 h-10 rounded-full bg-[#d8a355] flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-[#00312e]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{userName || "المستخدم"}</p>
                {roleLabel && (
                  <span className="text-[10px] bg-[#d8a355]/30 text-[#d8a355] px-2 py-0.5 rounded-full font-semibold">{roleLabel}</span>
                )}
              </div>
              <ChevronLeft size={16} className="text-white/40 flex-shrink-0" />
            </button>
          ) : (
            <Button onClick={() => handleNav("/login")} className="w-full bg-[#d8a355] hover:bg-[#c99347] text-[#00312e] font-extrabold rounded-xl h-11">
              تسجيل الدخول
            </Button>
          )}
        </div>

        {/* محتوى الدرج */}
        <div className="flex-1 overflow-y-auto bg-white">

          <SectionHeader title="التنقل" />
          <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
            <NavItem icon={Home} label="الرئيسية" onClick={() => handleNav("/")} />
            <NavItem icon={Trophy} label="الإنجازات" onClick={() => handleNav("/achievements")} />
            <NavItem icon={MessageSquare} label="تواصل معنا" onClick={() => handleNav("/contact")} />
          </div>

          {isLoggedIn && userRole === "student" && (
            <>
              <SectionHeader title="منطقتي" />
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <NavItem icon={Map} label="مساري" onClick={() => handleNav("/pathways")} />
                <NavItem icon={Target} label="التحدي اليومي" onClick={() => handleNav("/daily-challenge")} gold />
                <NavItem icon={Store} label="المتجر" onClick={() => handleNav("/store")} />
              </div>
            </>
          )}

          {isLoggedIn && userRole === "teacher" && (
            <>
              <SectionHeader title="أدواتي" />
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <NavItem icon={Gamepad2} label="المسابقات" onClick={() => handleNav("/competitions")} />
                <NavItem icon={Users} label="إدارة الحلقة" onClick={() => handleNav("/teacher/halaqah/1")} />
                <NavItem icon={ClipboardCheck} label="تحضير الطلاب" onClick={() => { setIsAttendanceModalOpen(true); setIsMobileMenuOpen(false); }} />
              </div>
            </>
          )}

          <SectionHeader title="الترتيب والحلقات" />
          <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
            <CollapseSection icon={Star} label="أفضل الطلاب / الحلقات" isOpen={isStudentsOpen} onToggle={() => setIsStudentsOpen(!isStudentsOpen)}>
              <NavItem icon={Users} label="جميع الطلاب" onClick={() => handleNav("/students/all")} indent />
              {circlesLoading ? (
                <p className="pr-10 pl-4 py-3 text-xs text-[#00312e]/40 font-medium">جاري التحميل...</p>
              ) : (
                circles.map((c) => (
                  <NavItem key={c.name} icon={BookOpen} label={c.name} onClick={() => handleNav(\`/halaqat/\${c.name}\`)} indent />
                ))
              )}
            </CollapseSection>
          </div>

          {isLoggedIn && isAdmin && (
            <>
              <SectionHeader title="لوحة التحكم" />
              <div className="mx-3 rounded-xl overflow-hidden border border-[#d8a355]/30 mb-1">
                <NavItem icon={LayoutDashboard} label="لوحة التحكم" onClick={() => handleNav("/admin/dashboard")} gold />

                <CollapseSection icon={Users} label="إدارة الطلاب" isOpen={isAdminStudentsOpen} onToggle={() => setIsAdminStudentsOpen(!isAdminStudentsOpen)}>
                  {[
                    { icon: UserPlus, label: "إضافة طالب", path: "/admin/dashboard?action=add-student" },
                    { icon: UserMinus, label: "إزالة طالب", path: "/admin/dashboard?action=remove-student" },
                    { icon: ArrowRightLeft, label: "نقل طالب", path: "/admin/dashboard?action=transfer-student" },
                    { icon: Settings, label: "تعديل بيانات طالب", path: "/admin/dashboard?action=edit-student" },
                    { icon: Edit2, label: "تعديل نقاط طالب", path: "/admin/dashboard?action=edit-points" },
                    { icon: FileText, label: "سجلات الطلاب", path: "/admin/student-records" },
                    { icon: Award, label: "إنجازات الطلاب", path: "/admin/students-achievements" },
                    { icon: Users, label: "جميع الطلاب", path: "/students/all" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>

                <NavItem icon={Settings} label="إدارة المعلمين" onClick={() => handleNav("/admin/teachers")} />
                <NavItem icon={BookOpen} label="إدارة الحلقات" onClick={() => handleNav("/admin/circles")} />
                <NavItem icon={ShieldCheck} label="الهيكل الإداري" onClick={() => handleNav("/admin/admins")} />
                <NavItem icon={Zap} label="الصلاحيات" onClick={() => handleNav("/admin/permissions")} />
                <NavItem icon={UserPlus} label="طلبات الإلتحاق" onClick={() => handleNav("/admin/enrollment-requests")} />

                <CollapseSection icon={FileText} label="التقارير" isOpen={isAdminReportsOpen} onToggle={() => setIsAdminReportsOpen(!isAdminReportsOpen)}>
                  {[
                    { icon: FileText, label: "تقارير المعلمين", path: "/admin/teacher-attendance" },
                    { icon: FileText, label: "السجل اليومي للطلاب", path: "/admin/student-daily-attendance" },
                    { icon: FileText, label: "تقارير الطلاب", path: "/admin/student-reports" },
                    { icon: FileText, label: "تقارير الرسائل", path: "/admin/reports" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>

                <CollapseSection icon={Send} label="التواصل والإشعارات" isOpen={isAdminCommOpen} onToggle={() => setIsAdminCommOpen(!isAdminCommOpen)}>
                  {[
                    { icon: Send, label: "إرسال لأولياء الأمور", path: "/admin/whatsapp-send" },
                    { icon: MessageSquare, label: "ردود واتساب", path: "/admin/whatsapp-replies" },
                    { icon: Phone, label: "أرقام أولياء الأمور", path: "/admin/guardian-phones" },
                    { icon: Bell, label: "الإشعارات", path: "/admin/notifications" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>

                <NavItem icon={Map} label="إدارة المسار" onClick={() => handleNav("/admin/pathways")} />
                <NavItem icon={ShoppingBag} label="إدارة المتجر" onClick={() => handleNav("/admin/store-management")} />
                <NavItem icon={ShoppingBag} label="طلبات المتجر" onClick={() => handleNav("/admin/store-orders")} />
                <NavItem icon={Trophy} label="إدارة الإنجازات" onClick={() => handleNav("/admin/achievements-management")} />
                <NavItem icon={Target} label="التحديات اليومية" onClick={() => handleNav("/admin/daily-challenges")} />
              </div>
            </>
          )}

          {isLoggedIn && (
            <div className="mx-3 mt-2 mb-6 rounded-xl overflow-hidden border border-red-100">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </span>
                <span className="flex-1 text-right">تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;
`;
fs.writeFileSync("components/header.tsx", content);
console.log("Done");
