const fs = require('fs');
let code = fs.readFileSync('lib/quran-data.ts', 'utf8');

if (!code.includes('getOffsetContent')) {
code += `
export function getOffsetContent(
  planStartPage: number,
  offset: number,
  size: number,
  totalPages: number = 0,
  direction: "asc" | "desc" = "asc"
) {
  let sessionStart = direction === "desc" ? (planStartPage + totalPages - offset - size) : planStartPage + offset;
  let sessionEnd = Math.min(sessionStart + size, 605);
  // Ensure we don't go below 1 or total limits depending on strict bounds if needed
  sessionStart = Math.max(1, sessionStart);
  
  if (size <= 0) return null;

  const startRef = getAyahByPageFloat(sessionStart);
  const endRef = getInclusiveEndAyah(sessionEnd);

  const startSurahName = SURAHS.find((x) => x.number === startRef.surah)!.name; 
  const endSurahName = SURAHS.find((x) => x.number === endRef.surah)!.name;     

  let formattedText = "";
  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah) {       
    formattedText = \`\${startSurahName} \${startRef.ayah}\`;
  } else {
    formattedText = \`\${startSurahName} \${startRef.ayah} - \${endSurahName} \${endRef.ayah}\`;
  }

  return { text: formattedText };
}
`;
fs.writeFileSync('lib/quran-data.ts', code);
console.log('Added getOffsetContent');
} else {
console.log('Already exists');
}
