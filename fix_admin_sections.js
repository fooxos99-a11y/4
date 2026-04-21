const fs = require("fs");
let content = fs.readFileSync("components/header.tsx", "utf-8");

// Add new state variables for isAdminGeneralOpen and isAdminGamesOpen if not present
if (!content.includes("isAdminGeneralOpen")) {
  content = content.replace(
    "const [isAdminCommOpen, setIsAdminCommOpen] = useState(false);",
    `const [isAdminCommOpen, setIsAdminCommOpen] = useState(false);
  const [isAdminGeneralOpen, setIsAdminGeneralOpen] = useState(false);
  const [isAdminGamesOpen, setIsAdminGamesOpen] = useState(false);`
  );
}

// Find start and end of the admin block
const adminStart = content.indexOf("{isLoggedIn && isAdmin && (");
const afterAdmin = content.indexOf("{isLoggedIn && (", adminStart + 10);
// Find the closing of the admin block - look for the </> then )}
// We'll find it by counting braces
const adminEnd = content.indexOf("\n          )}\n\n          {isLoggedIn && (");
const adminBlockOld = content.substring(adminStart, adminEnd + 1);

const adminBlockNew = `{isLoggedIn && isAdmin && (
            <>
              <SectionHeader title="لوحة التحكم" />
              <div className="mx-3 rounded-xl overflow-hidden border border-[#d8a355]/30 mb-1">
                <NavItem icon={LayoutDashboard} label="لوحة التحكم" onClick={() => handleNav("/admin/dashboard")} gold />
              </div>

              {/* فئة إدارة الطلاب */}
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <CollapseSection icon={Users} label="إدارة الطلاب" isOpen={isAdminStudentsOpen} onToggle={() => setIsAdminStudentsOpen(!isAdminStudentsOpen)}>
                  {[
                    { icon: UserPlus, label: "إضافة طالب", path: "/admin/dashboard?action=add-student" },
                    { icon: UserMinus, label: "إزالة طالب", path: "/admin/dashboard?action=remove-student" },
                    { icon: ArrowRightLeft, label: "نقل طالب", path: "/admin/dashboard?action=transfer-student" },
                    { icon: Settings, label: "تعديل بيانات الطالب", path: "/admin/dashboard?action=edit-student" },
                    { icon: Edit2, label: "تعديل نقاط الطالب", path: "/admin/dashboard?action=edit-points" },
                    { icon: FileText, label: "سجلات الطلاب", path: "/admin/student-records" },
                    { icon: Award, label: "إنجازات الطلاب", path: "/admin/students-achievements" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>
              </div>

              {/* فئة إدارة المستخدمين */}
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <CollapseSection icon={ShieldCheck} label="إدارة المستخدمين" isOpen={isAdminCommOpen} onToggle={() => setIsAdminCommOpen(!isAdminCommOpen)}>
                  {[
                    { icon: Settings, label: "إدارة المعلمين", path: "/admin/teachers" },
                    { icon: BookOpen, label: "إدارة الحلقات", path: "/admin/circles" },
                    { icon: ShieldCheck, label: "الهيكل الإداري", path: "/admin/admins" },
                    { icon: UserPlus, label: "طلبات الإلتحاق", path: "/admin/enrollment-requests" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>
              </div>

              {/* فئة التقارير */}
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <CollapseSection icon={FileText} label="التقارير" isOpen={isAdminReportsOpen} onToggle={() => setIsAdminReportsOpen(!isAdminReportsOpen)}>
                  {[
                    { icon: FileText, label: "تقارير المعلمين", path: "/admin/teacher-attendance" },
                    { icon: MessageSquare, label: "تقارير الرسائل", path: "/admin/reports" },
                    { icon: FileText, label: "السجل اليومي للطلاب", path: "/admin/student-daily-attendance" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>
              </div>

              {/* فئة الإدارة العامة */}
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <CollapseSection icon={Settings} label="الإدارة العامة" isOpen={isAdminGeneralOpen} onToggle={() => setIsAdminGeneralOpen(!isAdminGeneralOpen)}>
                  {[
                    { icon: Bell, label: "الإشعارات", path: "/admin/notifications" },
                    { icon: Map, label: "إدارة المسار", path: "/admin/pathways" },
                    { icon: ShoppingBag, label: "إدارة المتجر", path: "/admin/store-management" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>
              </div>

              {/* فئة الألعاب */}
              <div className="mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1">
                <CollapseSection icon={Gamepad2} label="الألعاب" isOpen={isAdminGamesOpen} onToggle={() => setIsAdminGamesOpen(!isAdminGamesOpen)}>
                  {[
                    { icon: Star, label: "قاعدة صور خمن الصورة", path: "/admin/guess-images" },
                    { icon: Zap, label: "قاعدة أسئلة المزاد", path: "/admin/auction-questions" },
                    { icon: BookOpen, label: "إدارة خلية الحروف", path: "/admin/letter-hive-questions" },
                    { icon: FileText, label: "قاعدة أسئلة الفئات", path: "/admin/questions" },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem key={label} icon={Ic} label={label} onClick={() => handleNav(path)} indent />
                  ))}
                </CollapseSection>
              </div>
            </>
          )}`;

content = content.replace(adminBlockOld, adminBlockNew);
fs.writeFileSync("components/header.tsx", content);
console.log("Admin section rewritten. Length:", adminBlockOld.length);
