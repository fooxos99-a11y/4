const fs = require('fs');
const file = 'app/profile/page.tsx';
let s = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* رأس الخطة: النص \+ مربعَي المراجعة والربط \*\/\}[\s\S]*?<div className="bg-white rounded-2xl border-2 px-4 py-4 shadow-sm flex flex-row-reverse items-center justify-between gap-3" style=\{\{ borderColor: "#d8a35530" \}\}>[\s\S]*?\{muraajaaContent && \([\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>/;

if (!s.match(regex)) {
    console.error("Regex not found!");
} else {
    console.log("Found, doing replace...");
}

const replacement = `{/* رأس الخطة: النص + مربعَي المراجعة والربط */}
                      <div className="bg-white rounded-2xl border-2 px-4 py-4 shadow-sm flex flex-row-reverse items-center justify-between gap-3" style={{ borderColor: "#d8a35530" }}>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[11px] text-[#c99347]/70 font-semibold mb-0.5">خطة الحفظ</p>
                          <p className="text-base font-black text-[#1a2332] leading-snug">
                            من سورة {planDirection === "asc" ? planData.start_surah_name : planData.end_surah_name} إلى سورة {planDirection === "asc" ? planData.end_surah_name : planData.start_surah_name}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{planData.daily_pages === 0.25 ? "ربع وجه يومياً" : planData.daily_pages === 0.5 ? "نصف وجه يومياً" : planData.daily_pages === 1 ? "وجه يومياً" : "وجهان يومياً"}</p>
                        </div>
                        {(() => {
                          const todayDateStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" })).toISOString().split("T")[0];
                          const todayRecord = attendanceRecords.find(r => r.date === todayDateStr);
                          const isMuraajaaCompleted = todayRecord?.status === "present" && todayRecord?.samaa_level && todayRecord?.samaa_level !== "not_completed";
                          const isRabtCompleted = todayRecord?.status === "present" && todayRecord?.rabet_level && todayRecord?.rabet_level !== "not_completed";

                          return (muraajaaContent || rabtContent) && (
                            <div className="flex flex-row-reverse gap-2 shrink-0 max-w-[55%]">
                              {rabtContent && (
                                <div className={\`flex flex-col relative items-center justify-center text-center border rounded-xl px-3 py-2 min-w-[75px] transition-all \${isRabtCompleted ? "bg-emerald-50 border-emerald-200" : "bg-blue-50/50 border-blue-200/50"}\`}>
                                  {isRabtCompleted && <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                  <p className={\`text-[9px] font-bold mb-0.5 \${isRabtCompleted ? "text-emerald-700" : "text-blue-600/70"}\`}>ربط اليوم</p>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{rabtContent.text}</p>
                                  <span className={\`text-[8px] font-medium mt-1 \${isRabtCompleted ? "text-emerald-600" : "text-neutral-400"}\`}>{isRabtCompleted ? "مكتمل" : "لم يُكمل"}</span>
                                </div>
                              )}
                              {muraajaaContent && (
                                <div className={\`flex flex-col relative items-center justify-center text-center border rounded-xl px-3 py-2 min-w-[75px] transition-all \${isMuraajaaCompleted ? "bg-emerald-50 border-emerald-200" : "bg-purple-50/50 border-purple-200/50"}\`}>
                                  {isMuraajaaCompleted && <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                  <p className={\`text-[9px] font-bold mb-0.5 \${isMuraajaaCompleted ? "text-emerald-700" : "text-purple-600/70"}\`}>مراجعة اليوم</p>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{muraajaaContent.text}</p>
                                  <span className={\`text-[8px] font-medium mt-1 \${isMuraajaaCompleted ? "text-emerald-600" : "text-neutral-400"}\`}>{isMuraajaaCompleted ? "مكتمل" : "لم يُكمل"}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>`;

s = s.replace(regex, replacement);
fs.writeFileSync(file, s);
console.log("Done patching");`