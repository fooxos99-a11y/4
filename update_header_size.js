const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf-8');

// remove hover effects and cursor pointer from wrapper
code = code.replace(
  '              <div className="relative flex items-center group cursor-pointer mr-2 md:mr-3 scale-105 md:scale-[1.15] transform-gpu drop-shadow-sm" style={{ direction: \'ltr\' }}>',
  '              <div className="relative flex items-center mr-2 md:mr-3 scale-105 md:scale-[1.15] transform-gpu drop-shadow-sm" style={{ direction: \'ltr\' }}>'
);

// remove onclick and hover scale from badge
code = code.replace(
  `                <div \r\n                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}\r\n                   className="relative flex flex-col items-center justify-center z-30 transform group-hover:scale-105 transition-all duration-300 drop-shadow-md"`,
  `                <div \r\n                   className="relative flex flex-col items-center justify-center z-30 transform transition-all duration-300 drop-shadow-md"`
);

code = code.replace(
  `                <div \n                   onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}\n                   className="relative flex flex-col items-center justify-center z-30 transform group-hover:scale-105 transition-all duration-300 drop-shadow-md"`,
  `                <div \n                   className="relative flex flex-col items-center justify-center z-30 transform transition-all duration-300 drop-shadow-md"`
);

// shrink bar height
code = code.replace(
  `onClick={() => handleNav("/profile?tab=plan")}\r\n                  className="relative flex items-center h-6 sm:h-7 w-28 sm:w-36 transition-all z-20 ml-[-24px]"`,
  `className="relative flex items-center h-4 sm:h-5 w-28 sm:w-36 transition-all z-20 ml-[-24px]"`
);

code = code.replace(
  `onClick={() => handleNav("/profile?tab=plan")}\n                  className="relative flex items-center h-6 sm:h-7 w-28 sm:w-36 transition-all z-20 ml-[-24px]"`,
  `className="relative flex items-center h-4 sm:h-5 w-28 sm:w-36 transition-all z-20 ml-[-24px]"`
);

fs.writeFileSync('components/header.tsx', code);
console.log('Update complete.');