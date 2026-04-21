const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove boxes
content = content.replace(/className="flex flex-col border border-\[#d8a355\]\/30 rounded-xl mt-2 mx-2 overflow-hidden bg-white"/g, 'className="flex flex-col pt-1"');

// Using purely functional replace so we can debug it:
content = content.replace(/className="[^"]*?flex items-center justify-between[^"]*?"[^>]*>[\s\S]*?<\/button>/g, (match) => {
  // If it's a Header like الطلاب
  if (match.includes('isStudentsMenuOpen ?') || match.match(/is[A-Za-z]+MenuOpen \?/)) {
    let replaced = match.replace('justify-between', 'justify-start gap-4');
    
    // The inner text usually is: <button ...>  Text {isOpen ? <Icon1> : <Icon2>} </button>
    // We want: <button ...>  {isOpen ? <Icon1> : <Icon2>} <span>Text</span> </button>
    // We'll extract the Text and the {...} part.
    let m = replaced.match(/>\s*([^<\{]+?)\s*(\{is[A-Za-z]+MenuOpen[^}]+?\})\s*<\/button>/);
    if (m) {
      let headText = m[1].trim();
      let reactExpr = m[2];
      replaced = replaced.replace(m[0], `>\n  ${reactExpr} <span>${headText}</span>\n</button>`);
    } else {
      // Special case for Games where it wraps it in a div:
      // > إدارة الألعاب <div ...> {isGamesMenuOpen ? ...} </div> </button>
      let mGames = replaced.match(/>\s*([^<]+?)\s*(<div[^>]*>\s*\{isGamesMenuOpen[^}]+\}\s*<\/div>)\s*<\/button>/);
      if (mGames) {
        let headText = mGames[1].trim();
        let divExpr = mGames[2];
        replaced = replaced.replace(mGames[0], `>\n  ${divExpr} <span>${headText}</span>\n</button>`);
      }
    }
    return replaced;
  }
  
  // If it's a normal Submenu Item with Icon at the end like: إضافة طالب <UserPlus size={16} ... />
  let replaced = match.replace('justify-between', 'justify-start gap-3');
  let m2 = replaced.match(/>\s*([^<]+)\s*(<[A-Z][a-zA-Z0-9]+[^>]*\/>)\s*<\/button>/);
  if (m2) {
    let text = m2[1].trim();
    let icon = m2[2];
    replaced = replaced.replace(m2[0], `>\n  ${icon} <span>${text}</span>\n</button>`);
  }
  return replaced;
});

// Also replace links that don't have icons (just text)
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?text-sm font-bold[^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');

content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?hover:text-\[#d8a355\][^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');


fs.writeFileSync('components/header.tsx', content);

console.log("Success exact matching");
