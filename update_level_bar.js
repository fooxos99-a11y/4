const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const startMarker = '{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}';
const endMarker = '{isLoggedIn && userRole !== "student" && (';

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = \`{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}
            {isLoggedIn && userRole === "student" && (
              <div
                className="relative flex items-center group cursor-pointer mr-1 md:mr-2"
              >
                {/* الشريط الخاص بالمستوى (تصميم مشابه للصورة المرفقة) */}
                <div 
                  onClick={() => handleNav("/profile?tab=plan")}
                  className="relative flex items-center justify-end h-8 sm:h-9 w-24 sm:w-32 bg-[#001b19] shadow-[0_0_10px_rgba(45,212,191,0.3)] transition-all group-hover:scale-[1.02]"
                  style={{
                    clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
                    marginLeft: "-12px", // للالتصاق بالصورة
                    paddingLeft: "16px",
                    paddingRight: "8px",
                  }}
                >
                  {/* خلفية التعبئة (تعمل كشريط تقدم) */}
                  <div 
                    className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-[#1eb2a6] to-[#4ce0d3] transition-all duration-1000 z-0"
                    style={{ width: \\\`\${sidebarPlanProgress ?? 0}%\\\` }}
                  >
                    {/* تأثير إضاءة داخلي */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] animate-shimmer bg-[length:200%_100%] opacity-50" />
                  </div>
                  
                  {/* حدود بيضاء خفيفة للشريط */}
                  <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.4)",
                      clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)"
                    }}
                  />

                  {/* نص النسبة والمستوى */}
                  <div className="relative z-20 flex flex-col items-center justify-center w-full mt-[1px]">
                     <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide leading-none">
                       {sidebarPlanProgress ?? 0}%
                     </span>
                  </div>
                </div>

                {/* أيقونة الملف الشخصي الملتصقة بالشريط */}
                <div 
                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}
                   className="relative w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-[#1eb2a6] to-[#043d38] rounded-full flex items-center justify-center z-20 border-[2.5px] border-[#4ce0d3] shadow-[0_0_12px_rgba(45,212,191,0.5)] transform group-hover:rotate-6 transition-transform duration-300"
                >
                  <User size={20} className="text-white drop-shadow-md" />
                  {/* نقطة خضراء صغيرة كإشارة للاتصال إذا أردت */}
                  {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#00312e] rounded-full" /> */}
                </div>
              </div>
            )}

            \`;
  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
  fs.writeFileSync('components/header.tsx', content);
  console.log('Update successful');
} else {
  console.log('Markers not found');
}
