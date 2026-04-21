const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const oldStr = content.substring(
  content.indexOf('{/* ليفل بار إنجاز'),
  content.indexOf('{isLoggedIn && userRole !== "student" && (')
);

const newStr = `{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}
            {isLoggedIn && userRole === "student" && (
              <div className="relative flex items-center group cursor-pointer mr-1 md:mr-2">
                {/* الشريط الخاص بالمستوى (تصميم مشابه للصورة المرفقة) */}
                <div 
                  onClick={() => handleNav("/profile?tab=plan")}
                  className="relative flex items-center justify-end h-7 sm:h-8 w-24 sm:w-32 bg-[#001715] shadow-lg transition-all"
                  style={{
                    clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
                    marginLeft: "-14px", // للالتصاق بصورة الملف الشخصي
                    paddingLeft: "16px",
                    paddingRight: "8px",
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
                      clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)"
                    }}
                  />

                  {/* نص النسبة */}
                  <div className="relative z-20 flex flex-col items-center justify-center w-full mt-[1px]">
                     <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide leading-none">
                       {sidebarPlanProgress ?? 0}%
                     </span>
                  </div>
                </div>

                {/* أيقونة الملف الشخصي الملتصقة بالشريط */}
                <div 
                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}
                   className="relative w-9 h-9 sm:w-10 sm:h-10 bg-[#00312e] rounded-full flex items-center justify-center z-20 border-[2px] border-[#8beeeb] shadow-[0_0_8px_rgba(54,211,202,0.4)] transform group-hover:scale-105 transition-transform duration-300"
                >
                  <User size={18} className="text-white drop-shadow-md" />
                </div>
              </div>
            )}

            `;

content = content.replace(oldStr, newStr);

fs.writeFileSync('components/header.tsx', content);
console.log('Update successful');
