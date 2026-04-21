const fs = require('fs');

let code = fs.readFileSync('app/api/student-plans/route.ts', 'utf-8');

if (!code.includes('has_previous')) {
  // Add to destructuring
  code = code.replace(
    '      total_days: totalDaysOverride,\n    } = body',
    '      total_days: totalDaysOverride,\n      has_previous,\n      prev_start_surah,\n      prev_end_surah,\n      rabt_pages,\n      muraajaa_pages,\n    } = body'
  );

  // Add to insert object
  code = code.replace(
    '        direction: direction || "asc",\n      }])',
    '        direction: direction || "asc",\n        has_previous,\n        prev_start_surah,\n        prev_end_surah,\n        rabt_pages,\n        muraajaa_pages\n      }])'
  );

  fs.writeFileSync('app/api/student-plans/route.ts', code);
  console.log('API POST updated');
} else {
  console.log('API POST already updated');
}
