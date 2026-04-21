const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

code = code.replace('className="flex flex-col gap-1.5 shrink-0 max-w-[45%]"', 'className="flex gap-2 shrink-0 max-w-[55%]"');
code = code.replace(/<div className="flex flex-col justify-center/g, '<div className="flex flex-col items-center justify-center text-center');

fs.writeFileSync('app/profile/page.tsx', code);
