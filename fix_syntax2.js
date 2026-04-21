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
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      let newContent = content.replace(/} variant="outline"/g, '}} variant="outline"');
      // But wait! if it was `onClick={() => set(false)} variant="outline"` then `...se)} variant...` has no space before `variant`.
      // The issue is ` } variant="outline"`
      newContent = content.replace(/ \}\s*variant="outline"/g, ' }} variant="outline"');
      newContent = newContent.replace(/\)\s*variant="outline"/g, ')} variant="outline"');

      // Specifically check for `onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) } variant="outline"`
      newContent = newContent.replace(
        'onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) } variant="outline"',
        'onClick={() => { setIsEditDialogOpen(false); setEditingTeacher(null) }} variant="outline"'
      );

      // What about other broken ones?
      newContent = newContent.replace(
        'onClick={() => { setIsAddDialogOpen(false) } variant="outline"',
        'onClick={() => { setIsAddDialogOpen(false) }} variant="outline"'
      );

      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log('Fixed:', filePath);
        count++;
      }
    });
  });
  console.log("Total fixed:", count);
}

fixSyntax();
