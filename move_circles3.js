const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

let trigger = 'onClick={() => setIsCirclesMenuOpen(!isCirclesMenuOpen)}';
let idx = content.indexOf(trigger);

if (idx !== -1) {
    let divText = '<div className="mt-2 border-t border-slate-100 pt-2">';
    let startIdx = content.lastIndexOf(divText, idx);
    let closePart = '</div>\n                </div>\n              </div>';
    let endIdx = content.indexOf(closePart, startIdx);
    
    if (endIdx === -1) {
        closePart = '</div>\r\n                </div>\r\n              </div>';
        endIdx = content.indexOf(closePart, startIdx);
    }
    
    if (endIdx !== -1) {
        let blockFull = content.substring(startIdx, endIdx + closePart.length);
        
        // Remove from current pos
        content = content.replace(blockFull, '');
        
        blockFull = blockFull.replace(
            /أفضل الطلاب \/ الحلقات \{isCirclesMenuOpen \? (<ChevronDown[^>]+>) : (<ChevronLeft[^>]+>)\}/,
            '{isCirclesMenuOpen ? $1 : $2} <span>أفضل الطلاب</span>'
        );
        
        // Let's find insert spot exactly by searching for the </>\n              )} part.
        let insertAfterText = '</>\n              )}\n\n            </div>';
        if (!content.includes(insertAfterText)) {
            insertAfterText = '</>\r\n              )}\r\n\r\n            </div>';
        }
        
        if (content.includes(insertAfterText)) {
            content = content.replace(insertAfterText, '</>\n              )}\n\n' + blockFull + '\n            </div>');
            fs.writeFileSync('components/header.tsx', content);
            console.log('Success moving');
        } else {
            console.log("Could not find insert spot text");
        }
    } else {
        console.log("Could not find end of block");
    }
}
