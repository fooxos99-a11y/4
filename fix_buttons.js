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

const foldersToProcess = ['app', 'components'];
let modifiedFiles = 0;

foldersToProcess.forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) return;
  
  walkDir(dirPath, filePath => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let originalCode = fs.readFileSync(filePath, 'utf8');
    let code = originalCode;

    // 1. Text replaces
    // For Save:
    code = code.replace(/>\s*حفظ\s+(التغييرات|تغييرات|البيانات|الطالب|الإعدادات|تعديلات|المعلم)\s*</g, '>حفظ<');
    code = code.replace(/([\`\"\'])حفظ\s+(التغييرات|البيانات|الطالب|تغييرات|تعديلات|الإعدادات|المعلم)\1/g, '$1حفظ$1');
    
    // For Cancel:
    code = code.replace(/>\s*إلغاء\s+(الأمر|العملية|الاضافة|التعديل)\s*</g, '>إلغاء<');
    code = code.replace(/([\`\"\'])إلغاء\s+(الأمر|العملية|الاضافة|التعديل)\1/g, '$1إلغاء$1');

    // 2. Class Replaces
    
    // Attempting a regex replace for the Button class when it contains "حفظ" or "إلغاء",
    // But it's safer to find the <Button> tag surrounding "حفظ" and modify its class list.
    // Let's do a simple regex for buttons containing "حفظ"
    // <Button ... className="..." ...>حفظ</Button>
    
    // Since JSX parsing with regex is hard, let's look for standard patterns found in global-add-student-dialog.tsx:
    const saveClass1 = 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#C9A961]';
    const targetSaveClass = 'bg-[#D4AF37] text-white hover:bg-[#C9A961] focus:ring-[#D4AF37] border-transparent shadow-sm';
    
    code = code.replace(/text-\[#C9A961\]/g, 'text-white').replace(/bg-\[#D4AF37\]\/10/g, 'bg-[#D4AF37]').replace(/hover:bg-\[#D4AF37\]\/20/g, 'hover:bg-[#C9A961]');
    
    // For outline buttons usually used for cancel:
    // Some are `variant="outline" className="..."`
    // We want the text to be text-neutral-600, border-[#D4AF37]/40, rounded-xl, h-10
    // I will replace `text-neutral-500` with `text-neutral-600` only on buttons? 

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
      modifiedFiles++;
    }
  });
});

console.log(`Modified ${modifiedFiles} files.`);
