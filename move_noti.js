const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

const dropdownStartStr = '<DropdownMenu onOpenChange={async (open) => {';
const dropdownEndStr = '</DropdownMenu>';
const startIndex = content.indexOf(dropdownStartStr);
if (startIndex === -1) {
  console.log('Could not find dropdown start');
  process.exit(1);
}
const dropdownIndexEnd = content.indexOf(dropdownEndStr, startIndex) + dropdownEndStr.length;
const dropdownCode = content.substring(startIndex, dropdownIndexEnd);

// Replace original
const oldBlockRegex = /\{isLoggedIn && \(\s*<DropdownMenu onOpenChange=\{async \(open\) => \{[\s\S]*?<\/DropdownMenu>\s*\)\}/;
content = content.replace(oldBlockRegex, '{isLoggedIn && userRole !== "student" && (\n              ' + dropdownCode.replace(/\$/g, '$$$$') + '\n            )}');

// Add wrapper next to Menu button
const menuButtonCodeRegex = /(<button\s+className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white\/10 transition-colors z-20"\s+onClick=\{\(\) => setIsMobileMenuOpen\(true\)\}\s+aria-label="القائمة"\s*>\s*<Menu size=\{26\} \/>\s*<\/button>)/;
if (!menuButtonCodeRegex.test(content)) {
  console.log('Could not find menu button');
  process.exit(1);
}

// Notice I'm removing the z-20 from the inner button to put on the wrapper
let replaceVal = '<div className="flex items-center gap-2 z-20">\n            ' + 
  '$1'.replace(' z-20"', '"') + 
  '\n            {isLoggedIn && userRole === "student" && (\n              ' + dropdownCode.replace(/\$/g, '$$$$') + '\n            )}\n          </div>';

content = content.replace(menuButtonCodeRegex, replaceVal);

fs.writeFileSync('components/header.tsx', content);
console.log('Modifications applied successfully');