const fs = require('fs');
let code = fs.readFileSync('app/admin/dashboard/page.tsx', 'utf8');

let startIndex = code.indexOf('<Dialog open={isAddStudentDialogOpen}');
let endIndex = code.indexOf('</Dialog>', startIndex);
let dialogCode = code.substring(startIndex, endIndex);

let btn1 = dialogCode.indexOf('<Button');
console.log(dialogCode.substring(btn1 - 100, btn1 + 500));
