const fs = require('fs');
const filepath = 'lib/quran-data.ts';
let code = fs.readFileSync(filepath, 'utf8');

// The replacement logic:
const regex = /export function getAyahByPageFloat[\s\S]*?return end;\n  \}\n\}/;

const replacement = `export function getAyahByPageFloat(p: number): { surah: number; ayah: number } {
  if (p >= 605) return { surah: 114, ayah: 6 };
  const MathFloorP = Math.floor(p);
  const fraction = p % 1;
  const idx = MathFloorP - 1;
  const start = PAGE_REFERENCES[idx];
  if (fraction === 0) return start;

  const end = PAGE_REFERENCES[idx + 1] || { surah: 114, ayah: 6 };
  
  if (start.surah === end.surah) {
    const totalVersesInPage = end.ayah - start.ayah;
    return { surah: start.surah, ayah: start.ayah + Math.floor(totalVersesInPage * fraction) };
  } else {
    let totalVersesInPage = 0;
    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      if (sId === start.surah) totalVersesInPage += (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) totalVersesInPage += Math.max(0, end.ayah - 1);
      else totalVersesInPage += s.verseCount;
    }
    
    let targetVerses = Math.floor(totalVersesInPage * fraction);
    if (targetVerses === 0) return start;

    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      let vInSurah = 0;
      if (sId === start.surah) vInSurah = (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) vInSurah = Math.max(0, end.ayah - 1);
      else vInSurah = s.verseCount;

      if (targetVerses < vInSurah) {
        if (sId === start.surah) return { surah: sId, ayah: start.ayah + targetVerses };
        else return { surah: sId, ayah: targetVerses + 1 };
      } else {
        targetVerses -= vInSurah;
      }
    }
    return end;
  }
}`;

code = code.replace(regex, replacement);
fs.writeFileSync(filepath, code);
console.log('quran-data.ts updated!');