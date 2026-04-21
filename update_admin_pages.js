const fs = require('fs');

function updatePageStyle(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix background to standard unified one (if not already pure white or #f8f9fa)
  code = code.replace(/bg-\[#fafaf9\]/g, 'bg-[#f8f9fa]');

  // Fix main container padding
  code = code.replace(/<main className="flex-1 py-10 px-4">/g, '<main className="flex-1 py-10 px-4 md:px-8">');
  
  // Wrap student cards or list items to conform to the new Card style if they have old borders
  code = code.replace(/border border-\[#D4AF37\]\/40 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
  code = code.replace(/border border-\[#D4AF37\]\/20 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
  
  // Fix inner cards/sections
  code = code.replace(/rounded-xl bg-white border border-\[#D4AF37\]\/20/g, 'rounded-2xl border border-neutral-100 bg-white shadow-md');

  // Fix Dialog overlay color to neutral if any custom exists
  code = code.replace(/bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden/g, 'bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-100');

  fs.writeFileSync(filePath, code);
  console.log(`Updated layout for ${filePath}`);
}

const pages = [
  'app/admin/student-plans/page.tsx',
  'app/admin/student-daily-attendance/page.tsx',
  'app/admin/circles/page.tsx'
];

pages.forEach(updatePageStyle);
