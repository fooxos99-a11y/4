const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf8');

const regexWajh = /let label = ""[\s\S]*?\} else if \(daily === 1\) \{/;

const replacementWajh = `let label = ""
                    if (daily === 0.25) {
                      const wajh = Math.ceil(dayNum / 4);
                      const qStatus = (dayNum - 1) % 4;
                      if (planDirection === "desc") {
                         label = \`الوجه \${wajh} — الربع \${4 - qStatus}\`;
                      } else {
                         label = \`الوجه \${wajh} — الربع \${qStatus + 1}\`;
                      }
                    } else if (daily === 0.5) {
                      const wajh = Math.ceil(dayNum / 2)
                      if (planDirection === "desc") {
                        label = (dayNum % 2 === 1) ? \`الوجه \${wajh} — النصف الثاني\` : \`الوجه \${wajh} — النصف الأول\`
                      } else {
                        label = (dayNum % 2 === 1) ? \`الوجه \${wajh} — النصف الأول\` : \`الوجه \${wajh} — النصف الثاني\`
                      }
                    } else if (daily === 1) {`;

code = code.replace(regexWajh, replacementWajh);

// and then fix the labels below in the UI:
code = code.replace(/planData\.daily_pages === 0\.5 \? "نصف وجه يومياً"/g, 'planData.daily_pages === 0.25 ? "ربع وجه يومياً" : planData.daily_pages === 0.5 ? "نصف وجه يومياً"');

fs.writeFileSync('app/profile/page.tsx', code);
console.log('Profile fractions patched.');