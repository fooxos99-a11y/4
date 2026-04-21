const fs = require('fs');
const filepath = 'lib/quran-data.ts';
let code = fs.readFileSync(filepath, 'utf8');

const startStr = 'let parts = [];';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf('};', startIdx) + 2;

const replacement = `const startSurahName = SURAHS.find((x) => x.number === startRef.surah)!.name;
  const endSurahName = SURAHS.find((x) => x.number === endRef.surah)!.name;
  
  let formattedText = "";
  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah) {
    formattedText = \`\${startSurahName} \${startRef.ayah}\`;
  } else {
    // تنسيق: سورة آية - سورة آية
    formattedText = \`\${startSurahName} \${startRef.ayah} - \${endSurahName} \${endRef.ayah}\`;
  }

  return {
    text: formattedText,
    fromSurah: startSurahName,
    toSurah: endSurahName,
  };`;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync(filepath, code);
  console.log('quran-data.ts updated successfully!');
} else {
  console.log('Could not find target strings.');
}