const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf-8');

code = code.replace(
  /className="flex-1 overflow-y-auto bg-white \[[^"]+"/,
  'className="flex-1 overflow-y-auto bg-white pl-1 pr-0 [scrollbar-width:thin] [scrollbar-color:#3b82f6_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-500 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-blue-600"'
);

fs.writeFileSync('components/header.tsx', code);
console.log("Fixed scrollbar!");
