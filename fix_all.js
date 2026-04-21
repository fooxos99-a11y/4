const fs = require('fs');

['app/daily-challenge/page.tsx', 'app/profile/page.tsx', 'components/header.tsx', 'app/teacher/halaqah/[id]/page.tsx'].forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  let before = code;

  code = code.replace(/new Date\(\s*new Date\(\)\.toLocaleString\(\s*['"]en-US['"]\s*,\s*\{\s*timeZone:\s*['"]Asia\/Riyadh['"]\s*\}\s*\)\s*\)\.toISOString\(\)\.split\(\s*['"]T['"]\s*\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())");
  
  code = code.replace(/const now = new Date\(\);?\s*const saDate = new Date\(now\.toLocaleString\(\s*['"]en-US['"]\s*,\s*\{\s*timeZone:\s*['"]Asia\/Riyadh['"]\s*\}\s*\)\);?\s*const todayStr = saDate\.toISOString\(\)\.split\(\s*['"]T['"]\s*\)\[0\];/g, "const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());");

  code = code.replace(/const now = new Date\(\);?\s*const saDate = new Date\(now\.toLocaleString\(\s*['"]en-US['"]\s*,\s*\{\s*timeZone:\s*['"]Asia\/Riyadh['"]\s*\}\s*\)\);?\s*return saDate\.toISOString\(\)\.split\(\s*['"]T['"]\s*\)\[0\]/g, "return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())");

  if(code !== before) {
    fs.writeFileSync(file, code);
    console.log('Fixed', file);
  }
});
