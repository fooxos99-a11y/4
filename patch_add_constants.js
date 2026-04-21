const fs = require('fs');

let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const newConstants = `
const MURAAJAA_OPTIONS = [
  { value: "20", label: "جزء واحد (20 وجه)" },
  { value: "40", label: "جزئين (40 وجه)" },
  { value: "60", label: "3 أجزاء (60 وجه)" },
]

const RABT_OPTIONS = [
  { value: "10", label: "10 أوجه" },
  { value: "20", label: "جزء واحد (20 وجه)" },
]
`;

if (!code.includes('MURAAJAA_OPTIONS')) {
  code = code.replace('const DAILY_OPTIONS = [', newConstants + '\nconst DAILY_OPTIONS = [');
  fs.writeFileSync('app/admin/student-plans/page.tsx', code);
  console.log('Constants added');
} else {
  console.log('Constants already exist');
}
