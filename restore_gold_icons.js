const fs = require('fs');

let filePath = 'app/admin/dashboard/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// The icons in the dialogs were turned to text-slate-400
code = code.replace(/<([A-Z][a-zA-Z0-9]*)\s+className="w-5 h-5 text-slate-400"/g, '<$1 className="w-5 h-5 text-[#C9A961]"');
code = code.replace(/text-slate-400/g, 'text-[#C9A961]'); // Just revert it generally if any were lost 

// The top card icons were changed to text-slate-700 in clean_dashboard.js:
// code = code.replace(/text-\[#D4AF37\]/g, 'text-slate-700'); 
// Let's restore the top card icons to #D4AF37
code = code.replace(/text-slate-700/g, 'text-[#D4AF37]');

// The add student icon box 
code = code.replace(/text-base">＋<\/span>/g, 'text-lg font-bold">＋</span>');

fs.writeFileSync(filePath, code);

// Also let's check global-remove-student-dialog.tsx or other modals to ensure they have #C9A961
function walkDir(dir) {
    let entries = fs.readdirSync(dir);
    entries.forEach(f => {
      let dirPath = require('path').join(dir, f);
      if (fs.statSync(dirPath).isDirectory()) {
        walkDir(dirPath);
      } else if(dirPath.endsWith('.tsx')) {
        let originalCode = fs.readFileSync(dirPath, 'utf8');
        let newCode = originalCode.replace(/text-slate-400/g, 'text-[#C9A961]');
        if (newCode !== originalCode) {
           fs.writeFileSync(dirPath, newCode);
        }
      }
    });
  }
  
walkDir('./components');
walkDir('./app');

console.log('Restored icons to golden color.');
