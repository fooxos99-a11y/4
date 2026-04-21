const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf8');

code = code.replace(/path: "\?action=remove-student"/g, 'path: "/admin/dashboard?action=remove-student"');
code = code.replace(/path: "\?action=transfer-student"/g, 'path: "/admin/dashboard?action=transfer-student"');
code = code.replace(/path: "\?action=edit-student"/g, 'path: "/admin/dashboard?action=edit-student"');
code = code.replace(/path: "\?action=edit-points"/g, 'path: "/admin/dashboard?action=edit-points"');
code = code.replace(/path: "\?action=add-student"/g, 'path: "/admin/dashboard?action=add-student"');

// And what about student-records? Wait, it's global, so maybe it's the `router.push(href)` logic that doesn't merge query parameters in next?
// If we pass `?action=student-records` while being on `/admin/teachers`, `router.push('?action=student-records')` creates `/?action=student-records` instead of `/admin/teachers?action=student-records`! We should fix `handleNav`.

fs.writeFileSync('components/header.tsx', code);
console.log("Replaced!");
