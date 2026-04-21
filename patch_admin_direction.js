const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf8');

// 1. Remove useState for direction
code = code.replace(/const \[direction, setDirection\] = useState<"asc" \| "desc">\("asc"\);\s*/, '');

// 2. Define direction, startNum, endNum earlier so it's computed automatically
const oldOptionsCodeMatches = code.match(/\/\/ السور مرتبة تنازلياً[\s\S]*?const previewTotal =/);

const newOptionsCode = `// السور مرتبة تنازلياً (من الناس إلى البقرة)
  const surahsDescending = [...SURAHS].reverse();

  const startNum = startSurah ? parseInt(startSurah) : null;
  const endNum = endSurah ? parseInt(endSurah) : null;
  const direction = (startNum && endNum && startNum > endNum) ? "desc" : "asc";

  // خيارات بداية الخطة
  const startSurahOptions = (() => {
    let opts = SURAHS; // إظهار كل السور في البداية
    if (hasPrevious && prevStartSurah && prevEndSurah) {
      const pStart = parseInt(prevStartSurah);
      const pEnd = parseInt(prevEndSurah);
      const min = Math.min(pStart, pEnd);
      const max = Math.max(pStart, pEnd);
      opts = opts.filter((s) => s.number < min || s.number > max);
    }
    return opts;
  })();

  // قائمة السور المتاحة لنهاية الخطة
  const endSurahOptions = (() => {
    if (!startNum) return startSurahOptions;
    // يمكنه اختيار أي سورة أخرى كـ نهاية، والتصاعدي والتنازلي يحسب تلقائيا
    return startSurahOptions.filter((s) => s.number !== startNum);
  })();

  // إعادة تعيين النهاية إذا أصبحت غير صالحة
  const isEndValid =
    endNum !== null && endSurahOptions.some((s) => s.number === endNum);
  const previewTotal =`;

code = code.replace(oldOptionsCodeMatches[0], newOptionsCode);

// 3. Remove the UI toggle for direction (Line 610-650 roughly)
const toggleRegex = /<div className="space-y-3">[\s\S]*?<label className="text-sm font-bold text-\[#1a2332\]">اتجاه الخطة<\/label>[\s\S]*?<\/div>[\s\S]*?<p className="text-\[11px\] text-neutral-400">[\s\S]*?<\/p>[\s\S]*?<\/div>/;

code = code.replace(toggleRegex, '');

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('Admin direction logic patched successfully');