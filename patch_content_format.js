const fs = require('fs');
let c = fs.readFileSync('lib/quran-data.ts', 'utf8');

c = c.replace(
  '  let formattedText = "";\n' +
  '  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah) {\n' +
  '    formattedText = `${startSurahName} ${startRef.ayah}`;\n' +
  '  } else {\n' +
  '    // تنسيق: سورة آية - سورة آية\n' +
  '    formattedText = `${startSurahName} ${startRef.ayah} - ${endSurahName} ${endRef.ayah}`;\n' +
  '  }',
  `  let formattedText = "";
  const startCustom = startRef.customText ? \` (\${startRef.customText})\` : "";
  const endCustom = endRef.customText ? \` (\${endRef.customText})\` : "";
  
  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah && startCustom === endCustom) {
    formattedText = \`\${startSurahName} \${startRef.ayah}\${startCustom}\`;
  } else {
    formattedText = \`\${startSurahName} \${startRef.ayah}\${startCustom} - \${endSurahName} \${endRef.ayah}\${endCustom}\`;
  }`
);

fs.writeFileSync('lib/quran-data.ts', c);
console.log('getSessionContent string format updated.');
