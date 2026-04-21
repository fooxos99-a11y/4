const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch(e) { return; }
  entries.forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixSyntax() {
  let count = 0;
  ['app', 'components'].forEach(folder => {
    const dirPath = path.join(__dirname, folder);
    if (!fs.existsSync(dirPath)) return;
    
    walkDir(dirPath, filePath => {
      if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
      
      let originalCode = fs.readFileSync(filePath, 'utf8');
      
      // The issue is: `onClick={() => { ... } variant="outline"`
      // Notice the missing `}` for `onClick={...}`
      // Let's replace `} variant="outline" className="border-[#D4AF37]/40`
      // But wait! It could be `onClick={() => setIsOpen(false)}` matching, which would then be `false} variant=...` missing a closing brace? No, `false)` doesn't have a brace unless there's a space.
      // Easiest reliable fix for exactly this exact file:
      
      // Let's find: `} variant="outline" className="border-[#D4AF37]/40`
      // Wait, there are two kinds of `onClick`. Some have 1 closing brace, some have multiple?
      
      // The correct full button is: `<Button onClick={...} variant="outline" className="...">إلغاء</Button>`.
      // What if we just fix it generically:
      // If we see ` ` (space) then `variant="outline" className="..."`
      
      // The previous regex was: `code = code.replace(/<Button[^>]+onClick=\{([^}]+)\}[^>]*>\s*إلغاء\s*<\/Button>/g, \`<Button onClick={$1} \${cancelProps}>إلغاء</Button>\`);`
      // It took `([^}]+)` which stops at the first `}`! But `onClick` might have nested braces `onClick={() => { set(false) }}`
      // So if the match didn't include the final brace, the output got broken.
      
      // Let's just find `} variant="outline" className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10 bg-white hover:bg-neutral-50">إلغاء</Button>`
      // and look backward and count braces.
      // Actually, since build is complaining about `<Button onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) } variant=...`
      
      let newCode = originalCode.replace(/onClick=\{\(\) => \{ ([^}]+) \} variant="outline"/g, 'onClick={() => { $1 }} variant="outline"');
      newCode = newCode.replace(/onClick=\{\(\) => \{([^}]+)\} variant="outline"/g, 'onClick={() => {$1}} variant="outline"');
      
      // Let's search for any `onClick={... ` without a closing brace.
      // Another match might be `<Button onClick={() => set(null) variant=` (missing bracket).
      newCode = newCode.replace(/onClick=\{\(\) => ([^(]+)\(([^)]+)\) variant=/g, 'onClick={() => $1($2)} variant=');
      newCode = newCode.replace(/onClick=\{([a-zA-Z0-9_]+) variant=/g, 'onClick={$1} variant=');

      // Specifically fixing global-teachers-dialog.tsx line 436:
      newCode = newCode.replace(
        `onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) } variant="outline"`,
        `onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} variant="outline"`
      );
      
      // Let's replace any `) variant="outline"` which means the bracket is missing:
      newCode = newCode.replace(/\) variant="outline"/g, ')} variant="outline"');
      // Wait, if it was `onClick={() => set(false)} variant=`, it should be `onClick={() => set(false)} variant=`
      // The previous regex left it as `onClick={() => set(false) variant="outline"` ... `}` was removed.
      
    });
  });
}
