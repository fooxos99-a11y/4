const fs = require('fs');
let c = fs.readFileSync('lib/quran-data.ts', 'utf8');

const newLogic = `
  const mathFloorP = Math.floor(p);
  const fraction = p % 1;
  
  if (mathFloorP === 48 && fraction > 0) {
    if (Math.abs(fraction - 0.5) < 0.1) {
      return { surah: 2, ayah: 282, customText: "السطر 7" };
    } else {
      return { surah: 2, ayah: 282, customText: "السطر " + Math.floor(15 * fraction) };
    }
  }

  const idx = mathFloorP - 1;
  const start = PAGE_REFERENCES[idx];
  if (fraction === 0) return start;

  const end = PAGE_REFERENCES[idx + 1] || { surah: 114, ayah: 6 };

  if (start.surah === end.surah) {
    const totalVersesInPage = end.ayah - start.ayah;
    return { surah: start.surah, ayah: start.ayah + Math.floor(totalVersesInPage * fraction) };
`;

c = c.replace(
  '  const MathFloorP = Math.floor(p);\n' +
  '  const fraction = p % 1;\n' +
  '  const idx = MathFloorP - 1;\n' +
  '  const start = PAGE_REFERENCES[idx];\n' +
  '  if (fraction === 0) return start;\n' +
  '\n' +
  '  const end = PAGE_REFERENCES[idx + 1] || { surah: 114, ayah: 6 };\n' +
  '\n' +
  '  if (start.surah === end.surah) {\n' +
  '    const totalVersesInPage = end.ayah - start.ayah;\n' +
  '    return { surah: start.surah, ayah: start.ayah + Math.floor(totalVersesInPage * fraction) };',
  newLogic
);

fs.writeFileSync('lib/quran-data.ts', c);
console.log('Math.floor logic injected.');
