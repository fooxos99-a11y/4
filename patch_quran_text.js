const fs = require('fs');
const filepath = 'lib/quran-data.ts';
let code = fs.readFileSync(filepath, 'utf8');

const regex = /let parts = \[\];[\s\S]*?return \{[\s\S]*?text:\s*parts\.join\(" \+ "\),[\s\S]*?fromSurah: SURAHS\.find\(\(x\) => x\.number === startRef\.surah\)! \.name,[\s\S]*?toSurah: SURAHS\.find\(\(x\) => x\.number === endRef\.surah\)!\.name,[\s\S]*?\};/m;

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

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(filepath, code);
  console.log('quran-data.ts updated!');
} else {
  console.log('Regex did not match.');
}