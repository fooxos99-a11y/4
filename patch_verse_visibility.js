const fs = require('fs');

const path = 'app/admin/student-plans/page.tsx';
let data = fs.readFileSync(path, 'utf8');

// For startSurah
data = data.replace(/\{startSurah && \(\s*<div className="w-24">/g, '<div className="w-24">');
data = data.replace(/<Select value=\{startVerse\} onValueChange=\{setStartVerse\}>/g, '<Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah}>');
// We need to carefully remove the closing `)}` but only for the verse selectors. It's safer to just run a targeted string replace.

data = fs.readFileSync(path, 'utf8'); // reset

const startSurahPattern = /\{startSurah && \(\s*<div className="w-24">([\s\S]*?)<\/Select>\s*<\/div>\s*\)\}/;
const startSurahReplacement = `<div className="w-24">$1</Select>\n                      </div>`;

data = data.replace(startSurahPattern, startSurahReplacement);
data = data.replace('<Select value={startVerse} onValueChange={setStartVerse}>', '<Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah}>');

const endSurahPattern = /\{endSurah && \(\s*<div className="w-24">([\s\S]*?)<\/Select>\s*<\/div>\s*\)\}/;
const endSurahReplacement = `<div className="w-24">$1</Select>\n                      </div>`;

data = data.replace(endSurahPattern, endSurahReplacement);
data = data.replace('<Select value={endVerse} onValueChange={setEndVerse}>', '<Select value={endVerse} onValueChange={setEndVerse} disabled={!endSurah}>');

// Also do it for prevStartSurah and prevEndSurah if they were hidden
const prevStartSurahPattern = /\{prevStartSurah && \(\s*<div className="w-24">([\s\S]*?)<\/Select>\s*<\/div>\s*\)\}/;
if (prevStartSurahPattern.test(data)) {
  data = data.replace(prevStartSurahPattern, `<div className="w-24">$1</Select>\n                        </div>`);
  data = data.replace('<Select value={prevStartVerse} onValueChange={setPrevStartVerse}>', '<Select value={prevStartVerse} onValueChange={setPrevStartVerse} disabled={!prevStartSurah}>');
}

const prevEndSurahPattern = /\{prevEndSurah && \(\s*<div className="w-24">([\s\S]*?)<\/Select>\s*<\/div>\s*\)\}/;
if (prevEndSurahPattern.test(data)) {
  data = data.replace(prevEndSurahPattern, `<div className="w-24">$1</Select>\n                        </div>`);
  data = data.replace('<Select value={prevEndVerse} onValueChange={setPrevEndVerse}>', '<Select value={prevEndVerse} onValueChange={setPrevEndVerse} disabled={!prevEndSurah}>');
}

fs.writeFileSync(path, data);
console.log('Patched visibility successfully!');
