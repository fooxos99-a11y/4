const fs = require('fs'); let c = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8'); 
console.log(c.includes('grid grid-cols-1 md:grid-cols-2 gap-4 mt-6')); 
