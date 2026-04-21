const fs = require('fs');
const path = require('path');
function walkDir(dir, callback) {
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch(e) { return;}
  entries.forEach(f => {
    let dp = path.join(dir, f);
    if(fs.statSync(dp).isDirectory()) walkDir(dp, callback);
    else callback(dp);
  });
}
let count = 0;
['app', 'components'].forEach(dir => {
  if (!fs.existsSync(path.join(__dirname, dir))) return;
  walkDir(path.join(__dirname, dir), file => {
    if(!file.endsWith('.tsx') && !file.endsWith('.jsx')) return;
    let oldCode = fs.readFileSync(file, 'utf8');
    let code = oldCode;
    
    // Fix missing closing braces on onClick strings that map exactly to missing ones.
    
    // Pattern 1: `onClick={() => setAcceptRequest(null) variant="outline"` (missing brace for `(null)`)
    code = code.replace(/onClick=\{\(\) => ([^(]+)\(([^)]+)\)\s+variant="outline"/g, 'onClick={() => $1($2)} variant="outline"');

    // Pattern 2: `onClick={() => setIsOpen(false) variant="outline"`
    code = code.replace(/onClick=\{\(\) => ([a-zA-Z0-9_]+)\(([^)]+)\)\s+variant="outline"/g, 'onClick={() => $1($2)} variant="outline"');
    
    // Pattern 3: `onClick={() => { ... } variant="outline"` (missing brace for `{ ... }`)
    // Find literal `{` and `}` before `variant="..."
    code = code.replace(/onClick=\{\(\) => \{\s*([^}]+)\s*\}\s*variant="outline"/g, 'onClick={() => { $1 }} variant="outline"');
    
    // Just to cover everything that ends in either false, null, true, or }, and immediately has variant="outline"
    code = code.replace(/false\s+variant="outline"/g, 'false} variant="outline"');
    code = code.replace(/null\s+variant="outline"/g, 'null} variant="outline"');
    code = code.replace(/true\s+variant="outline"/g, 'true} variant="outline"');
    // If it is `onClick={() => { ... } variant` -> `onClick={() => { ... }} variant`
    code = code.replace(/ \} variant="outline"/g, ' }} variant="outline"');
    
    // Strip duplicate braces that might have been caused
    code = code.replace(/false\}\} variant="outline"/g, 'false} variant="outline"');
    code = code.replace(/null\}\} variant="outline"/g, 'null} variant="outline"');
    code = code.replace(/true\}\} variant="outline"/g, 'true} variant="outline"');
    code = code.replace(/\}\}\} variant="outline"/g, '}} variant="outline"');
    code = code.replace(/\)\}\} variant="outline"/g, ')} variant="outline"');

    if(code !== oldCode) {
      fs.writeFileSync(file, code);
      count++;
    }
  });
});
fs.writeFileSync('fixed_count.txt', count.toString());
