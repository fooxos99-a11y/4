const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

const regexBoxes = /<div className="flex gap-2 shrink-0">[\s\S]*?<div className="text-center bg-\[#d8a355\]\/8 border border-\[#d8a355\]\/25 rounded-xl px-3 py-2 min-w-\[56px\]">[\s\S]*?<p className="text-lg font-black text-\[#c99347\]">\{totalDays\}<\/p>[\s\S]*?<p className="text-\[9px\] text-neutral-400 font-semibold">الإجمالي<\/p>[\s\S]*?<\/div>[\s\S]*?<div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 min-w-\[56px\]">[\s\S]*?<p className="text-lg font-black text-emerald-600">\{totalDays - planCompletedDays\}<\/p>[\s\S]*?<p className="text-\[9px\] text-neutral-400 font-semibold">المتبقي<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replaceBoxes = `                        {(muraajaaContent || rabtContent) && (
                          <div className="flex flex-col gap-1.5 shrink-0 max-w-[45%]">
                            {rabtContent && (
                              <div className="flex flex-col justify-center bg-blue-50/50 border border-blue-200/50 rounded-lg px-2.5 py-1.5">
                                <p className="text-[9px] text-blue-600/70 font-semibold mb-0.5">ربط اليوم</p>
                                <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{rabtContent.text}</p>
                              </div>
                            )}
                            {muraajaaContent && (
                              <div className="flex flex-col justify-center bg-purple-50/50 border border-purple-200/50 rounded-lg px-2.5 py-1.5">
                                <p className="text-[9px] text-purple-600/70 font-semibold mb-0.5">مراجعة اليوم</p>
                                <p className="text-[11px] font-bold text-slate-800 line-clamp-1" dir="rtl">{muraajaaContent.text}</p>
                              </div>
                            )}
                          </div>
                        )}`;

code = code.replace(regexBoxes, replaceBoxes);

const regexReturn = `const completed = planAttendance[i] || null
                    return { dayNum, label, sessionContent, completed }
                  })

                  return (`

const replaceReturn = `const completed = planAttendance[i] || null
                    return { dayNum, label, sessionContent, completed }
                  })

                  const activeDayNum = Math.min(planCompletedDays + 1, totalDays);

                  let muraajaaContent = null;
                  if (planData.muraajaa_pages && planData.muraajaa_pages > 0) {
                    const mStartSurah = SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number));
                    if (mStartSurah) {
                      muraajaaContent = getSessionContent(mStartSurah.startPage, Number(planData.muraajaa_pages), activeDayNum, 0, planDirection);
                    }
                  }

                  let rabtContent = null;
                  if (planData.rabt_pages && planData.rabt_pages > 0) {
                    const rStartSurah = SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number));
                    if (rStartSurah) {
                      rabtContent = getSessionContent(rStartSurah.startPage, Number(planData.rabt_pages), activeDayNum, 0, planDirection);
                    }
                  }

                  return (`

code = code.replace(regexReturn, replaceReturn);

fs.writeFileSync('app/profile/page.tsx', code);
console.log("Patched successfully.");