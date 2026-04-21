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

let modifiedFiles = 0;

['app', 'components'].forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) return;
  
  walkDir(dirPath, filePath => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let originalCode = fs.readFileSync(filePath, 'utf8');
    let code = originalCode;

    // Standard Cancel Class
    const cancelProps = `variant="outline" className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10 bg-white hover:bg-neutral-50"`;

    // A slightly complex regex to replace any <Button ...>إلغاء</Button>
    // Note: since JS regex in string easily misses nested groups, let's just do a string replace 
    // on common patterns observed in the grep.

    code = code.replace(/<Button[^>]+onClick=\{([^}]+)\}[^>]*>\s*إلغاء\s*<\/Button>/g, `<Button onClick={$1} ${cancelProps}>إلغاء</Button>`);
    
    // Some buttons are native <button onClick={...} className="...">إلغاء</button>
    // We should replace them to Button as well since they should match.
    // However, if we don't import <Button>, changing to <Button> might fail the build. Let's just fix the className for native buttons.
    const nativeCancelProps = `className="border border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10 px-4 bg-white hover:bg-neutral-50"`;
    code = code.replace(/<button[^>]+onClick=\{([^}]+)\}[^>]*>\s*إلغاء\s*<\/button>/g, `<button onClick={$1} ${nativeCancelProps}>إلغاء</button>`);

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
      modifiedFiles++;
    }
  });
});

console.log(`Modified Phase 3 (Cancel): ${modifiedFiles} files.`);
