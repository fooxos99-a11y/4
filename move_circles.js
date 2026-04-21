const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

// The block to extract:
//               <div className="mt-2 border-t border-slate-100 pt-2">\s*<button \s*onClick=\{\(\) => setIsCirclesMenuOpen(?:.+?)</div>\s*</div>

let startIdx = content.indexOf('<button \n                  onClick={() => setIsCirclesMenuOpen(!isCirclesMenuOpen)}');
if (startIdx === -1) {
  startIdx = content.indexOf('onClick={() => setIsCirclesMenuOpen(!isCirclesMenuOpen)}');
}

// Let's use a regex to match the exact block accurately. We know it starts with `<div className="mt-2 border-t border-slate-100 pt-2">` and has `isCirclesMenuOpen`
let regex = /<div className="mt-2 border-t border-slate-100 pt-2">\s*<button[^>]*isCirclesMenuOpen[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*/;

let match = content.match(regex);
if (match) {
  console.log("Found circles menu block!");
  let block = match[0];
  
  // Remove block from its current location
  content = content.replace(block, '');
  
  // Change title: from "أفضل الطلاب / الحلقات" to "أفضل الطلاب"
  block = block.replace('أفضل الطلاب / الحلقات', 'أفضل الطلاب');
  
  // Find where to append it
  // We want to put it after:
  //                   </div>
  //                 </>
  //               )}
  // 
  //             </div>
  //           </div>
  //         </div>
  // The easiest is to find `</> \n                )} \n\n              </div>`
  
  let appendTarget = /<\/>\s*}\)\s*}\s*<\/div>/;
  let targetMatch = content.match(appendTarget);
  if (targetMatch) {
    let replacedTarget = targetMatch[0].replace('</div>', block + '</div>');
    content = content.replace(targetMatch[0], replacedTarget);
    fs.writeFileSync('components/header.tsx', content);
    console.log("Successfully moved block.");
  } else {
    console.log("Could not find the target to append.");
  }
} else {
  console.log("Could not find circles block.");
}
