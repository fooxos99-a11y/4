const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

content = content.replace(/className="[^"]*?flex items-center justify-between[^"]*?"[^>]*>[\s\S]*?<\/button>/g, (match) => {
  if (match.includes('isStudentsMenuOpen') || match.includes('MenuOpen')) {
    let replaced = match.replace('justify-between', 'justify-start gap-4');
    
    // Non-games headers
    let m = replaced.match(/>\s*(الطلاب|أفضل الطلاب \/ الحلقات|إدارة المستخدمين|التقارير|الإدارة العامة|لوحة تحكم الإدارة)\s*([\s\S]+?)<\/button>/);
    if (m) {
      let text = m[1];
      let iconExpr = m[2];
      replaced = replaced.replace(m[0], `>\n  ${iconExpr} <span>${text}</span>\n</button>`);
    } else {
      let mGames = replaced.match(/>\s*(إدارة الألعاب)\s*([\s\S]+?)<\/button>/);
      if (mGames) {
        let text = mGames[1];
        let iconExpr = mGames[2];
        replaced = replaced.replace(mGames[0], `>\n  ${iconExpr} <span>${text}</span>\n</button>`);
      }
    }
    return replaced;
  }
  
  // Normal items
  let replaced = match.replace('justify-between', 'justify-start gap-3');
  // Match text until the first `<`
  let m2 = replaced.match(/>\s*([^<]+)\s*(<[A-Z][\s\S]+?)<\/button>/);
  if (m2) {
    let text = m2[1].trim();
    let icon = m2[2];
    replaced = replaced.replace(m2[0], `>\n  ${icon} <span>${text}</span>\n</button>`);
  }
  return replaced;
});

fs.writeFileSync('components/header.tsx', content);
console.log("Success exact mapping");
