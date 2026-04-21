const fs = require('fs');

function fixCloseWindow(filePath) {
  try {
    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace(/router\.push\(['"]\?['"]\)/g, 'router.push(window.location.pathname)');
    code = code.replace(/router\.push\(String\.fromCharCode\(63\)\)/g, 'router.push(window.location.pathname)');
    fs.writeFileSync(filePath, code);
    console.log('Fixed ', filePath);
  } catch (e) {
    console.log('Error ', e);
  }
}

fixCloseWindow('components/admin-modals/global-student-records-dialog.tsx');
fixCloseWindow('components/admin-modals/global-bulk-add-student-dialog.tsx');
fixCloseWindow('components/admin-modals/global-teachers-dialog.tsx');
