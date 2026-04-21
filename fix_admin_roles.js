const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// Note: Replace userRole === "admin" checks
// Let's create an isAdmin derived variable just below state hooks
const hookRegex = /const \[isAttendanceModalOpen, setIsAttendanceModalOpen\] = useState\(false\);/;

if (hookRegex.test(content) && !content.includes('const isAdmin = adminRoles.includes')) {
  content = content.replace(hookRegex, `const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const adminRoles = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"];
  const isAdmin = adminRoles.includes(userRole || "");`);
}

// Replace occurrences of userRole === "admin" with isAdmin
content = content.replace(/userRole === "admin"/g, 'isAdmin');

fs.writeFileSync('components/header.tsx', content);
console.log("Admin roles fixed");