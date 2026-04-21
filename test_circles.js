const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

let trigger = 'onClick={() => setIsCirclesMenuOpen(!isCirclesMenuOpen)}';
let idx = content.indexOf(trigger);

if (idx !== -1) {
  // Find the preceding <div className="mt-2 border-t border-slate-100 pt-2">
  let divText = '<div className="mt-2 border-t border-slate-100 pt-2">';
  let startIdx = content.lastIndexOf(divText, idx);
  
  if (startIdx !== -1) {
    // finding the end of this block
    // We know it ends with:
    //                   </div>
    //                 </div>
    //               </div>
    let endText1 = '</div>\n                </div>\n              </div>';
    let endText2 = '</div>\r\n                </div>\r\n              </div>';
    
    let endIdx = content.indexOf(endText1, startIdx);
    if (endIdx === -1) endIdx = content.indexOf(endText2, startIdx);
    
    if (endIdx !== -1) {
      let fullMatch = content.substring(startIdx, endIdx + endText1.length); // approx
      // Wait, let's just make sure we capture up to the correct div.
      // Easiest way to parse matched opening and closing <divs> is manual counting, or just use string search since we know the exact content from read_file.
      let snippet = 
`<div className="mt-2 border-t border-slate-100 pt-2">
                <button 
                  onClick={() => setIsCirclesMenuOpen(!isCirclesMenuOpen)} 
                  className="w-full text-right py-3 px-4 rounded-lg active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer active:scale-95 transition-all flex items-center justify-start gap-4 font-extrabold text-[#00312e] text-[17px]"
                >
                  <ChevronDown size={18} className="text-[#d8a355]" /> <span>أفضل الطلاب / الحلقات {isCirclesMenuOpen ? </span> : <ChevronLeft size={18} className="text-[#d8a355]" />}
                </button>
                
                <div className={\`overflow-hidden transition-all duration-300 ease-in-out \${isCirclesMenuOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"}\`}>
                  <div className="flex flex-col gap-1 pr-2 border-r-2 border-[#d8a355]/30 mr-2">
                    <button onClick={() => handleNav("/students/all")} className="text-right py-2 px-4 rounded-lg active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer active:scale-95 transition-all flex items-center justify-start gap-4 text-sm font-bold text-[#00312e] border-b border-slate-100 pb-3 mb-1"><span>جميع الطلاب</span></button>
                    {circlesLoading ? <div className="p-2 px-4 text-xs text-right text-gray-400">جاري التحميل...</div> : circles.map(c => (
                      <button key={c.name} onClick={() => handleNav(\`/halaqat/\${c.name}\`)} className="text-right py-2 px-4 rounded-lg active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer active:scale-95 transition-all flex items-center justify-start gap-4 text-sm text-[#00312e]"><span>{c.name}</span></button>
                    ))}
                  </div>
                </div>
              </div>`;
      
      let snippetRTL = content.substring(startIdx, startIdx + 2000);
      console.log(snippetRTL.substring(0, 1000));
    }
  }
}
