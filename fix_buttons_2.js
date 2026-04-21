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

    // Remove hover:text-[#D4AF37] from buttons with text-white
    code = code.replace(/text-white\s+hover:text-\[#D4AF37\]/g, 'text-white');
    code = code.replace(/text-\[#D4AF37\]\s+hover:text-white/g, 'text-white'); // some might be this? Let's just strip known bad
    
    // Unify all instances of "حفظ" button class
    // From: className="border border-[#D4AF37]/50 bg-[#D4AF37] text-white"
    // To: className="flex-1 h-10 rounded-lg bg-[#D4AF37] text-white font-medium transition-colors hover:bg-[#C9A961] disabled:opacity-50"
    
    // There are some native <button> elements in pathways\page.tsx
    code = code.replace(
      /className="px-4 py-2 rounded-lg border border-\[#D4AF37\]\/50 bg-\[#D4AF37\] hover:bg-\[#C9A961\] text-white hover:text-\[#D4AF37\] text-sm font-semibold transition-colors">حفظ<\/button>/g,
      `className="px-4 py-2 rounded-lg bg-[#D4AF37] text-white hover:bg-[#C9A961] text-sm font-semibold transition-colors">حفظ</button>`
    );
    code = code.replace(
      /className="border border-\[#D4AF37\]\/50 bg-\[#D4AF37\] hover:bg-\[#C9A961\] text-white( hover:text-\[#D4AF37\])?">حفظ<\/Button>/g,
      `className="flex-1 h-10 rounded-lg bg-[#D4AF37] text-white font-medium hover:bg-[#C9A961]">حفظ</Button>`
    );

    // Make sure 'إلغاء' matches the exact cancel class. 
    // user said: "نفس تصميم زر إلغاء الحالي في اضافة طالب"
    const standardCancelClass = 'className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10"';
    
    // E.g.: <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)}>إلغاء</Button>
    // Just looking for `>إلغاء</Button>` and replacing its class if it's nearby
    // Let's do a simple regex: Look for `className="[^"]*"\s*(onClick=[^>]*)?>\s*إلغاء\s*<\/Button>`
    code = code.replace(
      /className="[^"]*"\s*(onClick=\{[^}]+\})\s*>\s*إلغاء\s*<\/Button>/g,
      `variant="outline" className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10" $1>إلغاء</Button>`
    );
    // Also without onClick (say, if it comes earlier or later)
    code = code.replace(
      /variant="outline"\s+onClick=\{([^}]+)\}\s*>\s*إلغاء\s*<\/Button>/g,
      `variant="outline" onClick={$1} className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10">إلغاء</Button>`
    );

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
      modifiedFiles++;
    }
  });
});

console.log(`Modified Phase 2: ${modifiedFiles} files.`);
