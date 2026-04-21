const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Add missing imports
content = content.replace(
  /import \{\s*ChevronDown, User, LogOut, Users,[^}]+\}\s*from\s*"lucide-react"/m,
  `import { 
  ChevronDown, User, LogOut, Users, 
  LayoutDashboard, Menu, X, ClipboardCheck,
  Trophy, Store, Map, Target, MessageSquare,
  Home, Gamepad2, Star
} from "lucide-react"`
);

// 2. Replace desktop nav manually
const newDesktopNav = `<nav className="hidden md:flex items-center gap-5 lg:gap-8 order-2 font-normal text-sm lg:text-base">
            <button onClick={() => handleNav("/")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/" ? "text-[#d8a355]" : ""}\`}><Home size={18}/> <span>الرئيسية</span></button>
            <button onClick={() => handleNav("/achievements")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/achievements" ? "text-[#d8a355]" : ""}\`}><Trophy size={18}/> <span>الإنجازات</span></button>
            
            {isLoggedIn && userRole === "student" && (
              <>
                <button onClick={() => handleNav("/pathways")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/pathways" ? "text-[#d8a355]" : ""}\`}><Map size={18}/> <span>المسار</span></button>
                <button onClick={() => handleNav("/daily-challenge")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/daily-challenge" ? "text-[#d8a355]" : ""}\`}><Target size={18}/> <span>التحدي اليومي</span></button>
                <button onClick={() => handleNav("/store")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/store" ? "text-[#d8a355]" : ""}\`}><Store size={18}/> <span>المتجر</span></button>
              </>
            )}

            {isLoggedIn && (userRole === "teacher" || userRole === "admin") && (
              <button onClick={() => handleNav("/competitions")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/competitions" ? "text-[#d8a355]" : ""}\`}><Gamepad2 size={18}/> <span>المسابقات</span></button>
            )}

            <button onClick={() => handleNav("/contact")} className={\`flex items-center gap-1 hover:text-[#d8a355] transition-colors \${pathname === "/contact" ? "text-[#d8a355]" : ""}\`}><MessageSquare size={18}/> <span>تواصل معنا</span></button>

            <div className="relative" onMouseEnter={() => setIsCirclesDropdownOpen(true)} onMouseLeave={() => setIsCirclesDropdownOpen(false)}>
              <button className="flex items-center gap-1 hover:text-[#d8a355] font-bold text-sm"><Star size={18} /> <span>أفضل الطلاب</span> <ChevronDown size={16} /></button>
              {isCirclesDropdownOpen && (
                <div className="absolute top-full right-0 w-48 bg-white text-[#00312e] shadow-xl rounded-lg py-2 mt-0 animate-in fade-in slide-in-from-top-1">
                  <button onClick={() => handleNav("/students/all")} className="w-full text-right px-4 py-2 hover:bg-[#f5f1e8] font-bold text-sm border-b border-[#eee]">جميع الطلاب</button>
                  {circlesLoading ? <div className="p-3 text-xs text-gray-400">جاري التحميل...</div> :
                    circles.map(c => (
                      <button key={c.name} onClick={() => handleNav(\`/halaqat/\${c.name}\`)} className="w-full text-right px-4 py-2 hover:bg-[#f5f1e8] font-bold text-sm">{c.name}</button>
                    ))
                  }
                </div>
              )}
            </div>
          </nav>`;

let desktopNavMatch = content.match(/<nav className="hidden md:flex items-center gap-5 lg:gap-8 order-2 font-bold text-sm lg:text-base">[\s\S]*?<\/nav>/);
if (desktopNavMatch) {
    content = content.replace(desktopNavMatch[0], newDesktopNav);
} else {
    console.log("Desktop nav not found!");
}

// 3. Replace mobile nav manually
const newMobileNav = `<nav className="flex flex-col p-4">
              <button onClick={() => handleNav("/")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><Home size={18}/> <span>الرئيسية</span></button>
              <button onClick={() => handleNav("/achievements")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><Trophy size={18}/> <span>الإنجازات</span></button>
              {/* زر المسابقات للجوال */}
              {isLoggedIn && (userRole === "teacher" || userRole === "admin") && (
                <button onClick={() => handleNav("/competitions")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><Gamepad2 size={18}/> <span>المسابقات</span></button>
              )}
              {isLoggedIn && userRole === "student" && (
                <>
                  <button onClick={() => handleNav("/pathways")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><Map size={18}/> <span>المسار</span></button>
                  <button onClick={() => handleNav("/daily-challenge")} className="text-right py-4 border-b flex items-center justify-start gap-3 text-[#d8a355] font-bold text-sm"><Target size={18}/> <span>التحدي اليومي</span></button>
                  <button onClick={() => handleNav("/store")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><Store size={18}/> <span>المتجر</span></button>
                </>
              )}
              <button onClick={() => handleNav("/contact")} className="text-right py-4 border-b flex items-center justify-start gap-3 font-bold text-sm"><MessageSquare size={18}/> <span>تواصل معنا</span></button>
              
              <div className="py-4">
                <p className="text-gray-400 text-xs mb-3 font-bold uppercase">أفضل الطلاب / الحلقات</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleNav("/students/all")} className="bg-[#f5f1e8] p-3 rounded-lg text-sm font-bold">جميع الطلاب</button>
                  {circles.map(c => (
                    <button key={c.name} onClick={() => handleNav(\`/halaqat/\${c.name}\`)} className="bg-slate-50 p-3 rounded-lg text-sm font-bold">{c.name}</button>
                  ))}
                </div>
              </div>
            </nav>`;

let mobileNavMatch = content.match(/<nav className="flex flex-col p-4">[\s\S]*?<\/nav>/);
if (mobileNavMatch) {
    content = content.replace(mobileNavMatch[0], newMobileNav);
} else {
    console.log("Mobile nav not found!");
}

fs.writeFileSync('components/header.tsx', content);
console.log("Update successful.");
