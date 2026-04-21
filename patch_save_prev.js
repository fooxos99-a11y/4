const fs = require('fs');

let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const anchor = '          direction,';
const targetString = anchor;

const codeToInsert = `          has_previous: hasPrevious,
          prev_start_surah: hasPrevious ? prevStartSurah : null,
          prev_end_surah: hasPrevious ? prevEndSurah : null,
          rabt_pages: hasPrevious ? parseFloat(rabtPages) : null,
          muraajaa_pages: hasPrevious ? parseFloat(muraajaaPages) : null,
`;

if (!code.includes('has_previous: hasPrevious')) {
  code = code.replace(targetString, targetString + '\n' + codeToInsert);
  fs.writeFileSync('app/admin/student-plans/page.tsx', code);
  console.log('API payload updated');
} else {
  console.log('API payload already updated');
}
