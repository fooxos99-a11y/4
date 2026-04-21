const fs = require('fs');
let c = fs.readFileSync('components/header.tsx', 'utf8');
c = c.replace(/<button className="md:hidden p-2/g, '<button className="flex p-2');
c = c.replace(/<nav className="hidden md:flex[^>]*>[\s\S]*?<\/nav>/, '');
c = c.replace(/<div className="flex-1 md:flex-initial flex justify-center md:justify-start order-2 md:order-1">/g, '<div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 flex justify-center">');
c = c.replace(/<div className="md:hidden bg-white/g, '<div className="bg-white');
fs.writeFileSync('components/header.tsx', c);
console.log('Replaced');
