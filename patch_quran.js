const fs = require('fs');
let code = fs.readFileSync('lib/quran-data.ts', 'utf-8');

const sIdx = code.indexOf('export function getVerseAtFloatPos');
if (sIdx !== -1) code = code.slice(0, sIdx);

const newCode = `

export function getAyahByPageFloat(p: number): { surah: number; ayah: number } {
  if (p >= 605) return { surah: 114, ayah: 6 };
  const MathFloorP = Math.floor(p);
  const idx = MathFloorP - 1;
  const start = PAGE_REFERENCES[idx];
  if (p % 1 === 0) return start;

  const end = PAGE_REFERENCES[idx + 1] || { surah: 114, ayah: 7 };
  if (start.surah === end.surah) {
    const totalVerses = end.ayah - start.ayah;
    return { surah: start.surah, ayah: start.ayah + Math.floor(totalVerses / 2) };
  } else {
    let totalVerses = 0;
    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      if (sId === start.surah) totalVerses += (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) totalVerses += Math.max(0, end.ayah - 1);
      else totalVerses += s.verseCount;
    }
    let half = Math.floor(totalVerses / 2);
    if (half === 0) return start;

    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      let vInSurah = 0;
      if (sId === start.surah) vInSurah = (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) vInSurah = Math.max(0, end.ayah - 1);
      else vInSurah = s.verseCount;

      if (half < vInSurah) {
        if (sId === start.surah) return { surah: sId, ayah: start.ayah + half };
        else return { surah: sId, ayah: half + 1 };
      } else {
        half -= vInSurah;
      }
    }
    return end;
  }
}

export function getInclusiveEndAyah(p: number) {
  const next = getAyahByPageFloat(p);
  if (next.surah === 114 && next.ayah === 7) return { surah: 114, ayah: 6 };
  if (next.ayah > 1) {
    return { surah: next.surah, ayah: next.ayah - 1 };
  } else {
    const prevSurah = SURAHS.find((s) => s.number === next.surah - 1)!;
    return { surah: prevSurah.number, ayah: prevSurah.verseCount };
  }
}

export function getSessionContent(
  planStartPage: number,
  dailyPages: number,
  sessionNum: number,
  totalPages: number = 0,
  direction: "asc" | "desc" = "asc"
): { text: string; fromSurah: string; toSurah: string } {
  let sessionStart = direction === "desc" ? (planStartPage + totalPages - sessionNum * dailyPages) : planStartPage + (sessionNum - 1) * dailyPages;
  let sessionEnd = sessionStart + dailyPages;
  // Make sure sessionEnd does not jump over the end of Quran
  sessionEnd = Math.min(sessionEnd, 605);
  
  const startRef = getAyahByPageFloat(sessionStart);
  const endRef = getInclusiveEndAyah(sessionEnd);

  let parts = [];
  if (startRef.surah === endRef.surah) {
    const sName = SURAHS.find((x) => x.number === startRef.surah)!.name;
    parts.push(startRef.ayah === endRef.ayah ? \`\${sName} (\${startRef.ayah})\` : \`\${sName} (\${startRef.ayah}-\${endRef.ayah})\`);
  } else {
    for (let sId = startRef.surah; sId <= endRef.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      if (sId === startRef.surah) {
        if (startRef.ayah === s.verseCount) parts.push(\`\${s.name} (\${startRef.ayah})\`);
        else parts.push(\`\${s.name} (\${startRef.ayah}-\${s.verseCount})\`);
      } else if (sId === endRef.surah) {
        if (endRef.ayah === 1) parts.push(\`\${s.name} (1)\`);
        else parts.push(\`\${s.name} (1-\${endRef.ayah})\`);
      } else {
        parts.push(s.name);
      }
    }
  }

  return {
    text: parts.join(" + "),
    fromSurah: SURAHS.find((x) => x.number === startRef.surah)!.name,
    toSurah: SURAHS.find((x) => x.number === endRef.surah)!.name,
  };
}
`;

code = code.replace(/\n*$/, '') + '\n' + newCode;
if (!code.includes('import { PAGE_REFERENCES }')) {
  code = "import { PAGE_REFERENCES } from './quran-pages';\n" + code;
}
fs.writeFileSync('lib/quran-data.ts', code);
