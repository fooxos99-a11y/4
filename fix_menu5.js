const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

content = content.replace(/className="[^"]*?flex items-center justify-between[^"]*?"[^>]*>[\s\S]*?<\/button>/g, (match) => {
  if (match.includes('MenuOpen')) {
    let replaced = match.replace('justify-between', 'justify-start gap-4');
    
    // Match any non-ASCII/non-tag text at the start, followed by the block:
    let m = replaced.match(/>\s*([\s\S]*?)\s*(\{is[A-Za-z]+MenuOpen[\s\S]+?)<\/button>/);
    if (m && !m[1].includes('<')) {
      let text = m[1].trim();
      let iconExpr = m[2];
      replaced = replaced.replace(m[0], `>\n  ${iconExpr} <span>${text}</span>\n</button>`);
    } else {
      let mGames = replaced.match(/>\s*([^<]+?)\s*(<div[^>]*>[\s\S]+?)<\/button>/);
      if (mGames) {
        let text = mGames[1].trim();
        let iconExpr = mGames[2];
        replaced = replaced.replace(mGames[0], `>\n  ${iconExpr} <span>${text}</span>\n</button>`);
      }
    }
    return replaced;
  }
  
  // Normal items
  let replaced = match.replace('justify-between', 'justify-start gap-2');
  let m2 = replaced.match(/>\s*([^<]+)\s*(<[A-Z][\s\S]+?)<\/button>/);
  if (m2 && !m2[1].includes('<')) {
    let text = m2[1].trim();
    let icon = m2[2];
    replaced = replaced.replace(m2[0], `>\n  ${icon} <span>${text}</span>\n</button>`);
  }
  return replaced;
});

fs.writeFileSync('components/header.tsx', content);
console.log("Success exact mapping 2");
