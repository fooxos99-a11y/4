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

['app', 'components'].forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) return;
  
  walkDir(dirPath, filePath => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;

    // We know these specific files were broken by missing a closing brace } before variant="outline".
    // 1. If it has `onClick={() => { ... } variant="outline"`
    newContent = newContent.replace(/onClick=\{\(\) => \{([^}]+)\}\s+variant="outline"/g, 'onClick={() => {$1}} variant="outline"');

    // 2. If it has `onClick={() => setAcceptRequest(null) variant="outline"`
    newContent = newContent.replace(/onClick=\{\(\) => ([^(]+)\(([^)]+)\)\s+variant="outline"/g, 'onClick={() => $1($2)} variant="outline"');

    // 3. For any single function call like `onClick={handleClose variant=`
    newContent = newContent.replace(/onClick=\{([a-zA-Z0-9_]+)\s+variant="outline"/g, 'onClick={$1} variant="outline"');

    // 4. Sometimes it was `onClick={() => setIsOpen(false)}` matching up to `}`. Then `variant=` starts. No wait, `[^}]+` matches `() => setIsOpen(false`. It consumed the `)`. 
    // And left: `onClick={() => setIsOpen(false variant=`
    newContent = newContent.replace(/onClick=\{\(\) => setIsOpen\(false\s+variant="outline"/g, 'onClick={() => setIsOpen(false)} variant="outline"');
    newContent = newContent.replace(/onClick=\{\(\) => setIsAddStudentDialogOpen\(false\s+variant="outline"/g, 'onClick={() => setIsAddStudentDialogOpen(false)} variant="outline"');
    newContent = newContent.replace(/onClick=\{\(\) => setIsBulkAddStudentDialogOpen\(false\s+variant="outline"/g, 'onClick={() => setIsBulkAddStudentDialogOpen(false)} variant="outline"');
    
    // Instead of guessing, let's catch ) missing its brace:
    newContent = newContent.replace(/\)\s+variant="outline"/g, ')} variant="outline"');

    // Fix the specific one from global-teachers-dialog.tsx:
    newContent = newContent.replace(
      /onClick=\{\(\) => \{\s*setIsEditDialogOpen\(false\);\s*setEditingTeacher\(null\)\s*\}\s*variant="outline"/g,
      `onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} variant="outline"`
    );
    
    // Double check if we doubled any braces: `onClick={() => set(false)}} variant=`
    newContent = newContent.replace(/\)\}\}\s+variant="outline"/g, ')} variant="outline"');
    
    // Some lines might be `onClick={() => setIsAddDialogOpen(false)} variant="outline"` 
    // If it is correctly: `onClick={() => setIsAddDialogOpen(false)} variant="outline"` we don't need to change.
    // The broken one was: `onClick={() => setIsAddDialogOpen(false variant="outline"`
    newContent = newContent.replace(/onClick=\{\(\) => ([a-zA-Z0-9_]+)\(([^)]*)\s+variant="outline"/g, 'onClick={() => $1($2)} variant="outline"');

    // Make sure: `onClick={() => setAcceptRequest(null variant="outline"` => `onClick={() => setAcceptRequest(null)} variant="outline"`
    newContent = newContent.replace(/\(null\s+variant="outline"/g, '(null)} variant="outline"');
    newContent = newContent.replace(/\(false\s+variant="outline"/g, '(false)} variant="outline"');
    newContent = newContent.replace(/\(true\s+variant="outline"/g, '(true)} variant="outline"');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log('Fixed:', filePath);
    }
  });
});
