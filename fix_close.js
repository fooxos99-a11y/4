const fs = require('fs');

function fixClose(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('usePathname')) {
    code = code.replace(/import { useRouter } from [\"']next\/navigation[\"']/, 'import { useRouter, usePathname } from "next/navigation"');
    code = code.replace(/import { useRouter(.*) } from [\"']next\/navigation[\"']/, 'import { useRouter, usePathname$1 } from "next/navigation"');
    
    // Some files might have `import { useSearchParams, usePathname, useRouter }` etc
    if (!code.includes('usePathname') && code.includes('next/navigation')) {
      code = code.replace(/import \{([^}]*)\}\s*from\s*['\"]next\/navigation['\"]/, (match, p1) => {
         if(!p1.includes('usePathname')) return `import { ${p1}, usePathname } from "next/navigation"`;
         return match;
      });
    }
  }
  
  if (!code.includes('const pathname = usePathname()')) {
    code = code.replace(/const router = useRouter\(\)/, 'const router = useRouter()\n  const pathname = usePathname()');
  }

  code = code.replace(/router\.push\(['"]\?['"]\)/g, 'router.push(pathname)');
  code = code.replace(/router\.push\(String\.fromCharCode\(63\)\)/g, 'router.push(pathname)');
  
  fs.writeFileSync(filePath, code);
  console.log('Fixed ', filePath);
}

fixClose('components/admin-modals/global-student-records-dialog.tsx');
fixClose('components/admin-modals/global-bulk-add-student-dialog.tsx');
fixClose('components/admin-modals/global-teachers-dialog.tsx');
