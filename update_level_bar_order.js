const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const oldStrStart = '{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}';
const oldStrEnd = '{isLoggedIn && userRole !== "student" && (';

const startIndex = content.indexOf(oldStrStart);
const endIndex = content.indexOf(oldStrEnd);

if(startIndex !== -1 && endIndex !== -1) {
    const oldStr = content.substring(startIndex, endIndex);

    const newBlock = \`{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}
            {isLoggedIn && userRole === "student" && (
              <div className="relative flex items-center group cursor-pointer mr-1 md:mr-2">
                
                {/* أيقونة الملف الشخصي اولاً (يمين في العربية) */}
                <div 
                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}
                   className="relative w-9 h-9 sm:w-10 sm:h-10 bg-[#00312e] rounded-full flex items-center justify-center z-20 border-[2px] border-[#8beeeb] shadow-[0_0_8px_rgba(54,211,202,0.4)] transform group-hover:scale-105 transition-transform duration-300"
                >
                  <User size={18} className="text-white drop-shadow-md" />
                </div>

                {/* الشريط الخاص بالمستوى (تصميم مشابه للصورة المرفقة) */}
                <div 
                  onClick={() => handleNav("/profile?tab=plan")}
                  className="relative flex items-center h-7 sm:h-8 w-24 sm:w-32 bg-[#001715] shadow-lg transition-all"
                  style={{
                    clipPath: "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)",
                    marginRight: "-14px", // ليدخل تحت الأيقونة
                    paddingRight: "16px", // لترك مساحة كافية بعد الدخول تحت الأيقونة
                    paddingLeft: "10px",
                  }}
                >
                  {/* خلفية التعبئة (تعمل كشريط تقدم) - تدرج سماوي مشابه للصورة */}
                  <div 
                    className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-[#36d3ca] to-[#8beeeb] transition-all duration-1000 z-0"
                    style={{ width: \\\`\${sidebarPlanProgress ?? 0}%\` }}
                  >
                     <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent"></div>
                  </div>
                  
                  {/* حدود بيضاء خفيفة للشريط */}
                  <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.7)",
                      clipPath: "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)"
                    }}
                  />

                  {/* نص النسبة */}
                  <div className="relative z-20 flex flex-col items-center justify-center w-full mt-[1px] ml-1">
                     <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide leading-none text-left w-full">
                       {sidebarPlanProgress ?? 0}%
                     </span>
                  </div>
                </div>
              </div>
            )}

            \`;
    content = content.replace(oldStr, newBlock);
    fs.writeFileSync('components/header.tsx', content);
    console.log('Fixed DOM order and shape');
}
