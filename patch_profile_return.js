const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

const regexReturn = /return\s*\{\s*dayNum,\s*label,\s*sessionContent,\s*completed\s*\}\s*\}\)\s*return\s*\(/m;

const replaceReturn = `return { dayNum, label, sessionContent, completed }
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