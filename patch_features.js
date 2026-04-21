const fs = require('fs');

const filesToPatch = [
  'app/students/all/page.tsx',
  'app/halaqat/[circleName]/page.tsx',
  'app/halaqat/musab/page.tsx'
];

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
     console.log('Skipping ' + filePath);
     return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Slow down the speed: 1.5 -> 0.5
  content = content.replace(/window\.scrollBy\(0,\s*scrollDirection\s*\*\s*1\.5\);/g, 'window.scrollBy(0, scrollDirection * 0.5);');

  // 2. Make button smaller: w-12 h-12 -> w-8 h-8
  content = content.replace(/className=\{ixed bottom-6 left-6 w-12 h-12/g, 'className={ixed bottom-6 left-6 w-8 h-8');

  // 3. Make icon smaller: size={20} -> size={16}
  // Be careful not to replace other icons
  content = content.replace(/<X size=\{20\} \/>/g, '<X size={16} />');
  content = content.replace(/<MonitorPlay size=\{20\} \/>/g, '<MonitorPlay size={16} />');

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + filePath);
});

