const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const insertionPoint = '<div className="z-20 flex items-center gap-2">';

const newContent = `
            {/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}
            {isLoggedIn && userRole === "student" && (
              <div 
                onClick={() => handleNav("/profile?tab=plan")}
                className="relative flex items-center h-11 cursor-pointer group ml-1"
                title="إنجاز الخطة"
              >
                {/* --- ضع صورتك هنا كخلفية لليفل بار --- */}
                {/* <img src="/مسار_الصورة" alt="Level BG" className="absolute inset-0 w-full h-full object-fill z-0" /> */}
                
                {/* تصميم افتراضي في حال لم تستخدم صورتك بعد */}
                <div className="absolute inset-0 bg-[#002220] border border-[#d8a355]/30 rounded-full shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] z-0 transition-colors group-hover:border-[#d8a355]/60" />
                
                <div className="relative z-10 flex items-center w-full px-1.5 gap-2 pr-2">
                  {/* شريط التقدم */}
                  <div className="flex flex-col items-end w-16 sm:w-20">
                    <span className="text-[9px] font-black text-[#d8a355] mb-0.5 tracking-wider font-sans whitespace-nowrap">
                      LEVEL
                    </span>
                    <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 relative"
                        style={{ 
                          width: \`\${sidebarPlanProgress ?? 0}%\`,
                          background: "linear-gradient(90deg, #b8860b 0%, #D4AF37 50%, #f0d060 100%)",
                          boxShadow: "0 0 10px rgba(212, 175, 55, 0.5)"
                        }}
                      >
                         <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:8px_8px] opacity-40"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* النسبة أو الأيقونة الدائرية */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d8a355] to-[#fcebb6] flex items-center justify-center shadow-[0_0_8px_rgba(216,163,85,0.4)] border-2 border-[#00312e] shrink-0 transform group-hover:scale-105 transition-transform duration-300">
                     <span className="text-[#002220] font-black text-[10px] sm:text-xs tracking-tighter">
                       {sidebarPlanProgress ?? 0}%
                     </span>
                  </div>
                </div>
              </div>
            )}
`;

content = content.replace(insertionPoint, insertionPoint + newContent);

fs.writeFileSync('components/header.tsx', content);
console.log('Done');
