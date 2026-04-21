const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const startIndex = content.indexOf('{/* ليفل بار إنجاز الخطة للمستوى بار للطالب في الأعلى يسار */}');
const endIndexStr = '{isLoggedIn && userRole !== "student" && (';
const endIndex = content.indexOf(endIndexStr);

if(startIndex !== -1 && endIndex !== -1) {
    const oldStr = content.substring(startIndex, endIndex);

    const newBlock = \`{/* ليفل بار إنجاز الخطة للطالب */}
            {isLoggedIn && userRole === "student" && (() => {
              const baseProgress = userAccountNumber === 1 ? 50 : (sidebarPlanProgress ?? 0);
              const currentLevel = Math.floor(baseProgress / 100) + 1;
              const displayProgress = baseProgress % 100;

              return (
              <div className="relative flex items-center group cursor-pointer mr-2 md:mr-3 scale-105 md:scale-[1.15] transform-gpu" style={{ direction: 'ltr' }}>
                
                {/* 1. شارة المستوى السداسية (أقصى اليسار) */}
                <div 
                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}
                   className="relative flex flex-col items-center justify-center z-30 transform group-hover:scale-105 transition-all duration-300 drop-shadow-md"
                   style={{
                     width: "44px",
                     height: "40px",
                     // الظل عبر الحاوية ليأخذ الشكل السداسي
                   }}
                >
                  {/* الإطار الخارجي (الأبيض/الرمادي) */}
                  <div className="absolute w-full h-full"
                       style={{
                         background: "linear-gradient(to bottom, #ffffff, #e1e4eb)",
                         clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                         padding: "2.5px" // سماكة الإطار الأبيض
                       }}>
                    {/* الحشوة الداخلية الرصاصية */}
                    <div className="relative w-full h-full flex items-center justify-center p-[2px]"
                         style={{
                           background: "linear-gradient(to bottom, #eceef3, #d3d7df)",
                           clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                           boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.8)"
                         }}>
                      
                      {/* الرقم باللون السماوي الفاقع نفس النجمة */}
                      <span 
                        className="relative z-10 text-[18px] sm:text-[20px] font-black pb-[1px]"
                        style={{
                          color: "#1caeae",
                          filter: "drop-shadow(0px -1px 0px rgba(255,255,255,1)) drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"
                        }}
                      >
                        {currentLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. شريط التقدم (يمين الشارة، وتدخل بدايته تحت الشارة) */}
                <div 
                  onClick={() => handleNav("/profile?tab=plan")}
                  className="relative flex items-center h-6 sm:h-7 w-28 sm:w-36 transition-all z-20 ml-[-24px]"
                  style={{
                    background: "linear-gradient(to bottom, #ffffff, #dcdede)", // نفس الإطار الخارجي
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                    padding: "2px",
                    paddingLeft: "0", // إزالة أي مسافة يسار حتى لا يظهر بياض
                  }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      background: "linear-gradient(to bottom, #e2e5eb, #ced3db)", // أرضية الشريط
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)"
                    }}
                  >
                    {/* التعبئة السماوية - من اليسار لليمين */}
                    <div 
                      className="absolute top-0 left-0 bottom-0 z-10 transition-all duration-1000"
                      style={{ 
                        width: \`\${Math.max(displayProgress, 8)}%\`, 
                        background: "linear-gradient(to bottom, #4adac1, #1bbbbb)",
                        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                      }}
                    >
                      {/* لمعة علوية للتعبئة */}
                      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}

            \`;

    content = content.replace(oldStr, newBlock);
    fs.writeFileSync('components/header.tsx', content);
    console.log('Update successful');
} else {
    console.log('Could not find markers');
}
