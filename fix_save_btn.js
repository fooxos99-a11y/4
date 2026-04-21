const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch(e) { return; }
  entries.forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const BAD_CLASSES = [
  /className="border border-\[#D4AF37\]\/50 bg-\[#D4AF37\]\/10 hover:bg-\[#D4AF37\]\/20 text-\[#C9A961\] hover:text-\[#D4AF37\]"/g,
  /className="px-4 py-2 rounded-lg border border-\[#D4AF37\]\/50 bg-\[#D4AF37\]\/10 hover:bg-\[#D4AF37\]\/20 text-\[#C9A961\] hover:text-\[#D4AF37\] text-sm font-semibold transition-colors"/g,
  /className="border border-\[#D4AF37\]\/40 bg-\[#D4AF37\]\/10 hover:bg-\[#D4AF37\]\/20 text-\[#C9A961\] hover:text-\[#D4AF37\]"/g
];

const GOOD_CLASS = 'className="bg-[#D4AF37] hover:bg-[#C9A961] text-white rounded-xl px-6 py-2 h-10 font-bold transition-all shadow-sm"';

let modifiedFiles = 0;

['app', 'components'].forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) return;
  
  walkDir(dirPath, filePath => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let originalCode = fs.readFileSync(filePath, 'utf8');
    let code = originalCode;

    BAD_CLASSES.forEach(regex => {
      code = code.replace(regex, GOOD_CLASS);
    });

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
      modifiedFiles++;
      console.log('Fixed save button in:', filePath);
    }
  });
});

console.log(`Modified save buttons in ${modifiedFiles} files.`);
