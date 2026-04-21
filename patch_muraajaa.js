const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf8');

// 1. imports
if (!code.includes('getOffsetContent')) {
  code = code.replace(/getSessionContent,\s+SURAHS/g, 'getSessionContent, getOffsetContent, SURAHS');
}

// 2. logic 
const searchStr = `                  const activeDayNum = Math.min(planCompletedDays + 1, totalDays);
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
                  }`;


const replaceStr = `                  const activeDayNum = Math.min(planCompletedDays + 1, totalDays);
                  
                  // -- NEW SMART SLIDING WINDOW LOGIC FOR MURAJAA AND RABT --
                  let muraajaaContent = null;
                  let rabtContent = null;
                  
                  const rootSurahNum = planData.prev_start_surah || planData.start_surah_number;
                  const rootSurah = SURAHS.find(s => s.number === rootSurahNum);
                  
                  if (rootSurah) {
                    const rootStartPage = rootSurah.startPage;
                    
                    // 1. Calculate Total Memorized Pages (TMP) up to today
                    let prevVolume = 0;
                    if (planData.has_previous && planData.prev_start_surah && planData.prev_end_surah) {
                      const s1 = SURAHS.find(s => s.number === planData.prev_start_surah);
                      const s2 = SURAHS.find(s => s.number === planData.prev_end_surah);
                      if (s1 && s2) {
                        const startP = s1.startPage;
                        let endP = 605;
                        if (s2.number < 114) {
                          const nextS = SURAHS.find(x => x.number === s2.number + 1);
                          if (nextS) endP = nextS.startPage;
                        }
                        prevVolume = Math.abs(endP - startP);
                      }
                    }
                    
                    const completedCurrentPlanPages = (activeDayNum - 1) * planData.daily_pages;
                    const tmp = prevVolume + completedCurrentPlanPages;
                    
                    if (tmp > 0) {
                      // 2. Rabt takes from the leading edge (up to its limit)
                      const rabtPref = Number(planData.rabt_pages) || 0;
                      const rabtSize = Math.min(rabtPref, tmp);
                      if (rabtSize > 0) {
                        const rabtOffset = tmp - rabtSize; // always the leading sequence
                        rabtContent = getOffsetContent(rootStartPage, rabtOffset, rabtSize, 0, planDirection);
                      }

                      // 3. Muraajaa slides through the remaining pool
                      const poolMuraajaa = tmp - rabtSize;
                      const muraajaaPref = Number(planData.muraajaa_pages) || 0;
                      if (poolMuraajaa > 0 && muraajaaPref > 0) {
                        // Slide the offset across the pool
                        let baseOffset = ((activeDayNum - 1) * muraajaaPref) % poolMuraajaa;
                        const mSize = Math.min(muraajaaPref, poolMuraajaa - baseOffset);
                        if (mSize > 0) {
                          muraajaaContent = getOffsetContent(rootStartPage, baseOffset, mSize, 0, planDirection);
                        }
                      }
                    }
                  }`;

// regex flexible replacement
const re = /const activeDayNum = Math\.min\(planCompletedDays \+ 1, totalDays\);[\s\S]*?if \(rStartSurah\) \{[\s\S]*?rabtContent = getSessionContent.*?;[\s\S]*?\}[\s\S]*?\}/m;

if (re.test(code)) {
    code = code.replace(re, replaceStr);
    fs.writeFileSync('app/profile/page.tsx', code);
    console.log("Patched Muraajaa/Rabt logic.");
} else {
    console.log("Could not find Target logic in profile/page.tsx");
}
