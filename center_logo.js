const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. the header layout completely rewritten
const headerLayoutStart = `<header className="bg-[#00312e] text-white sticky top-0 z-50 shadow-lg">`;
const headerLayoutMatch = content.match(/<header className="bg\[#00312e\] text-white sticky top-0 z-50 shadow-lg">([\s\S]*?)\{\/\* قائمة الموبايل \*\/\}/);

if (headerLayoutMatch) {
  const newHeaderLayout = `<header className="bg-[#00312e] text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
          
          <button className="flex p-2 z-20 text-white items-center justify-center hover:text-[#d8a355] transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
          </button>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center z-10 cursor-pointer" onClick={() => handleNav("/")}>
            <Image 
              src="/قبس.png" alt="قبس" width={100} height={60} 
              className="w-20 md:w-24 h-auto" 
            />
          </div>

          {/* قسم الحساب (الزاوية اليسرى) */}
          <div className="flex items-center z-20">`;

  let inner = headerLayoutMatch[1];
  
  // Try to find the section by identifying block boundaries instead of a regex that might fail.
  let accountIndex = inner.indexOf('{/* قسم الحساب');
  if (accountIndex !== -1) {
    let accountDivStart = inner.indexOf('<div', accountIndex);
    let beforeContent = inner.substring(0, accountDivStart);
    let afterContent = inner.substring(accountDivStart); // This holds the whole <div ...> ... </div> ... </div>
    
    // It's safer to strip the known desktop nav to ensure no issues
    let replaced = newHeaderLayout + '\n            ' + 
      (isLoggedInTagMatch(afterContent) ? extractAccountSection(afterContent) : afterContent.replace(/<div[^>]*>/, '')) + 
      '\n          </div>\n        </div>\n\n        {/* قائمة الموبايل */}';
      
    // better parsing:
    // we want just the contents of `<div className="order-1 md:order-3 flex items-center min-w-[80px]">`
    // wait we can just do string splitting:
    let accSplit = afterContent.split('{isLoggedIn ? (');
    if (accSplit.length > 1) {
       replaced = newHeaderLayout + '\n            {isLoggedIn ? (' + accSplit[1];
       // Wait, we need to handle the closing div of container
       // actually let's just do a simpler search and replace string
    }
  }
}

// Rewriting simpler logic:
let newFileContent = [];
let lines = content.split('\n');
let inDesktopNav = false;
let inAccountSection = false;
let accSectionLines = [];

for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('<header className="bg-[#00312e] text-white sticky top-0 z-50 shadow-lg">')) {
       newFileContent.push(lines[i]);
       newFileContent.push(`        <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">`);
       newFileContent.push(`          <button className="flex p-2 z-20 text-white items-center justify-center hover:text-[#d8a355] transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>`);
       newFileContent.push(`            {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}`);
       newFileContent.push(`          </button>`);
       newFileContent.push(``);
       newFileContent.push(`          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center z-10 cursor-pointer" onClick={() => handleNav("/")}>`);
       newFileContent.push(`            <Image `);
       newFileContent.push(`              src="/قبس.png" alt="قبس" width={100} height={60} `);
       newFileContent.push(`              className="w-20 md:w-24 h-auto" `);
       newFileContent.push(`            />`);
       newFileContent.push(`          </div>`);
       newFileContent.push(``);
       newFileContent.push(`          <div className="flex items-center z-20">`);
       
       // Skip original stuff until account section
       i++; // skip <div className="container...
       while (!lines[i].includes('قسم الحساب') && i < lines.length) {
           i++;
       }
       continue;
   }
   
   if (lines[i].includes('قسم الحساب')) {
       inAccountSection = true;
       // skip the <div className="order-1 .. ">
       while (!lines[i].includes('{isLoggedIn ? (')) {
           i++;
       }
       newFileContent.push(lines[i]);
       continue;
   }
   
   if (inAccountSection) {
       if (lines[i].includes('{/* قائمة الموبايل */}')) {
           inAccountSection = false;
           // closing the div
           newFileContent.pop(); // remove one </div>
           newFileContent.pop(); // remove the other </div> container
           newFileContent.push(`          </div>`);
           newFileContent.push(`        </div>`);
           newFileContent.push(``);
           newFileContent.push(lines[i]);
       } else {
           newFileContent.push(lines[i]);
       }
       continue;
   }
   
   // Handle mobile menu display:
   if (lines[i].includes('<div className="md:hidden bg-white')) {
       newFileContent.push(lines[i].replace('md:hidden ', ''));
       continue;
   }
   if (lines[i].includes('<button className="flex md:hidden')) {
       // we handled this above
       inAccountSection = true; // wait no
       continue;
   }
   if (lines[i].includes('<nav className="hidden md:flex')) {
       inAccountSection = true; 
   }
   
   // normal
   if (!inAccountSection && !inDesktopNav && i < lines.length && !lines[i].includes('<button className="flex md:hidden')) {
        newFileContent.push(lines[i]);
   }
}

// 2. Remove 'md:hidden' from mobile menu container
let finalStr = newFileContent.join('\n');
finalStr = finalStr.replace(/<div className="flex md:hidden[^>]*>[\s\S]*?<\/button>/m, ""); // Make sure it's gone if it crept in

fs.writeFileSync('components/header.tsx', finalStr);
console.log("Parsing & Replacement Complete");
