const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

// Replace the array mapping inside allDays
const targetSearch = `const completed = planAttendance[i] || null
                    return { dayNum, label, sessionContent, completed }`;
const targetReplace = `const completed = planAttendance[i] || null
                    
                    let muraajaaContent = null;
                    if (planData.muraajaa_pages && planData.muraajaa_pages > 0) {
                      const mStartSurah = SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number));
                      if (mStartSurah) {
                        muraajaaContent = getSessionContent(mStartSurah.startPage, Number(planData.muraajaa_pages), dayNum, 0, planDirection);
                      }
                    }
                    let rabtContent = null;
                    if (planData.rabt_pages && planData.rabt_pages > 0) {
                      const rStartSurah = SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number));
                      if (rStartSurah) {
                        rabtContent = getSessionContent(rStartSurah.startPage, Number(planData.rabt_pages), dayNum, 0, planDirection);
                      }
                    }

                    return { dayNum, label, sessionContent, completed, muraajaaContent, rabtContent }`;
code = code.replace(targetSearch, targetReplace);

// Now patch the rendering inside JSX
const jsxSearch = `{/* المحتوى */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={\`text-sm font-bold \${completed ? "text-emerald-700" : isNext ? "text-[#c99347]" : "text-neutral-400"}\`}>
                                        {label}
                                      </p>
                                      {isNext && (
                                        <span className="text-[10px] bg-[#d8a355]/15 text-[#c99347] px-1.5 py-0.5 rounded-full font-semibold">التالي</span>
                                      )}
                                    </div>
                                    <p className={\`text-[11px] mt-0.5 \${completed ? "text-emerald-600/70" : "text-neutral-400"}\`}>
                                      {sessionContent.text}
                                    </p>
                                  </div>`;

const jsxReplace = `{/* المحتوى */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={\`text-sm font-bold \${completed ? "text-emerald-700" : isNext ? "text-[#c99347]" : "text-neutral-400"}\`}>
                                        {label}
                                      </p>
                                      {isNext && (
                                        <span className="text-[10px] bg-[#d8a355]/15 text-[#c99347] px-1.5 py-0.5 rounded-full font-semibold">التالي</span>
                                      )}
                                    </div>
                                    <p className={\`text-[11px] mt-0.5 \${completed ? "text-emerald-600/70" : "text-neutral-400"}\`}>
                                      {sessionContent.text}
                                    </p>
                                    
                                    {(!completed) && (muraajaaContent || rabtContent) && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {rabtContent && (
                                          <div className="bg-blue-50/40 rounded-lg px-2.5 py-1 border border-blue-500/10 inline-flex items-center gap-1.5">
                                            <span className="text-[10px] text-blue-600/70 font-semibold whitespace-nowrap">ربط اليوم:</span>
                                            <span className="text-[10px] font-bold text-[#1a2332] whitespace-nowrap">{rabtContent.text}</span>
                                          </div>
                                        )}
                                        {muraajaaContent && (
                                          <div className="bg-purple-50/40 rounded-lg px-2.5 py-1 border border-purple-500/10 inline-flex items-center gap-1.5">
                                            <span className="text-[10px] text-purple-600/70 font-semibold whitespace-nowrap">مراجعة اليوم:</span>
                                            <span className="text-[10px] font-bold text-[#1a2332] whitespace-nowrap">{muraajaaContent.text}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>`;
                                  
code = code.replace(jsxSearch, jsxReplace);

fs.writeFileSync('app/profile/page.tsx', code);
console.log('Patched');
