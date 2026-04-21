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
        
        // Remove from content
        content = content.replace(blockFull, '');
        
        // Fix string naming and chevron ordering
        // it is: أفضل الطلاب / الحلقات {isCirclesMenuOpen ? <ChevronDown size={18} className="text-[#d8a355]" /> : <ChevronLeft size={18} className="text-[#d8a355]" />}
        blockFull = blockFull.replace(
            /أفضل الطلاب \/ الحلقات \{isCirclesMenuOpen \? (<ChevronDown[^>]+>) : (<ChevronLeft[^>]+>)\}/,
            '{isCirclesMenuOpen ? $1 : $2} <span>أفضل الطلاب</span>'
        );
        
        // Target append
        let targetRegex = /(<\/>\s*}\)\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/header>)/;
        let match = content.match(targetRegex);
        if (match) {
            content = content.replace(match[1], blockFull + '\n              ' + match[1]);
            fs.writeFileSync('components/header.tsx', content);
            console.log('Success moving');
        } else {
            console.log('Could not find insert spot');
        }
    } else {
        console.log("Could not find end of block");
    }
}
