const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove admin dashboard from account dropdown
const adminDashboardLinkRegex = /\{userRole === "admin" && \(\s*<DropdownMenuItem onClick=\{\(\) => handleNav\("\/admin\/dashboard"\)\}[^>]+><LayoutDashboard[^>]+>\s*لوحة التحكم\s*<\/DropdownMenuItem>\s*\)\}/;
// Since there's Arabic characters, let's just use string replacement on the exact code logic.
content = content.replace(/{userRole === "admin" && \(\s*<DropdownMenuItem onClick=\{\(\) => handleNav\("\/admin\/dashboard"\)\} className="py-3 gap-2 cursor-pointer text-slate-600"><LayoutDashboard size=\{18\}\/> [^<]+<\/DropdownMenuItem>\s*\)\}/, '');
// Fallback if the above regex fails:
content = content.replace('{userRole === "admin" && (\n                        <DropdownMenuItem onClick={() => handleNav("/admin/dashboard")} className="py-3 gap-2 cursor-pointer text-slate-600"><LayoutDashboard size={18}/> لوحة التحكم</DropdownMenuItem>\n                   )}', '');


// 2. Change the menu button to only show `Menu` icon (no X needed since X is in the drawer)
content = content.replace(
  /<button className="flex p-2 z-20 order-3" onClick=\{\(\) => setIsMobileMenuOpen\(!isMobileMenuOpen\)\}>\s*\{isMobileMenuOpen \? <X size=\{32\} \/> : <Menu size=\{32\} \/>\}\s*<\/button>/,
  `<button className="flex p-2 z-20 order-3" onClick={() => setIsMobileMenuOpen(true)}>\n            <Menu size={32} />\n          </button>`
);


// 3. Replace the entire "قائمة الموبايل" block with the new Drawer UI
const drawerCode = `{/* خلفية مظللة */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* القائمة الجانبية (Drawer الجانب الأيمن) */}
        <div className={\`fixed top-0 right-0 h-full w-72 sm:w-80 bg-white text-[#00312e] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col \${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}\`}>
            {/* رأس القائمة الجانبية */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#00312e] text-white">
                <Image 
                  src="/قبس.png" alt="قبس" width={90} height={50} 
                  className="w-20 md:w-24 h-auto cursor-pointer" 
                  onClick={() => {
                      handleNav("/");
                      setIsMobileMenuOpen(false);
                  }}
                />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <X size={24} />
                </button>
            </div>
            
            {/* المحتوى القابل للتمرير */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
               <nav className="flex flex-col">
                  <button onClick={() => { handleNav("/"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><Home size={18}/> <span>الرئيسية</span></button>
                  <button onClick={() => { handleNav("/achievements"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><Trophy size={18}/> <span>الإنجازات</span></button>
                  
                  {isLoggedIn && (userRole === "teacher" || userRole === "admin") && (
                    <button onClick={() => { handleNav("/competitions"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><Gamepad2 size={18}/> <span>المسابقات</span></button>
                  )}
                  
                  {isLoggedIn && userRole === "student" && (
                    <>
                      <button onClick={() => { handleNav("/pathways"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><Map size={18}/> <span>المسار</span></button>
                      <button onClick={() => { handleNav("/daily-challenge"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 text-[#d8a355] font-bold text-sm"><Target size={18}/> <span>التحدي اليومي</span></button>
                      <button onClick={() => { handleNav("/store"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><Store size={18}/> <span>المتجر</span></button>
                    </>
                  )}
                  
                  <button onClick={() => { handleNav("/contact"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-bold text-sm"><MessageSquare size={18}/> <span>تواصل معنا</span></button>

                  {/* لوحة التحكم للمشرفين فقط */}
                  {isLoggedIn && userRole === "admin" && (
                     <button onClick={() => { handleNav("/admin/dashboard"); setIsMobileMenuOpen(false); }} className="text-right py-4 border-b border-gray-100 hover:bg-[#f5f1e8] px-3 rounded-md transition-colors flex items-center justify-start gap-3 font-extrabold text-[#d8a355] text-sm">
                        <LayoutDashboard size={20}/> <span>لوحة التحكم للإدارة</span>
                     </button>
                  )}

                  <div className="py-6 px-3">
                    <p className="text-gray-400 text-xs mb-3 font-bold uppercase tracking-wider">أفضل الطلاب / الحلقات</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { handleNav("/students/all"); setIsMobileMenuOpen(false); }} className="bg-[#f5f1e8] hover:bg-[#e8dec5] transition-colors p-3 rounded-lg text-sm font-bold shadow-sm">جميع الطلاب</button>
                      {circles.map(c => (
                        <button key={c.name} onClick={() => { handleNav(\`/halaqat/\${c.name}\`); setIsMobileMenuOpen(false); }} className="bg-slate-50 hover:bg-slate-100 border transition-colors p-3 rounded-lg text-sm font-bold shadow-sm">{c.name}</button>
                      ))}
                    </div>
                  </div>
               </nav>
            </div>
        </div>`;

// Replace the old mobile menu block that starts with {/* قائمة الموبايل */}
const mobileMenuRegex = /\{\/\* قائمة الموبايل \*\/\}\s*\{isMobileMenuOpen && \([\s\S]*?<\/nav>\s*<\/div>\s*\)\}/;
if (mobileMenuRegex.test(content)) {
    content = content.replace(mobileMenuRegex, drawerCode);
} else {
    // If exact regex fails, manual slice
    const startIndex = content.indexOf('{/* قائمة الموبايل */}');
    const endIndex = content.lastIndexOf('</header>') - 1;
    if (startIndex !== -1) {
        const toReplace = content.substring(startIndex, endIndex);
        content = content.replace(toReplace, drawerCode + '\n      ');
    } else {
        console.log("Could not find قائمة الموبايل");
    }
}

fs.writeFileSync('components/header.tsx', content);
console.log("Drawer completely customized");
