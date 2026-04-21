const fs = require('fs');
const files = ['global-edit-points-dialog.tsx', 'global-edit-student-dialog.tsx', 'global-move-student-dialog.tsx', 'global-remove-student-dialog.tsx', 'global-bulk-add-student-dialog.tsx'];
for (const f of files) {
  const file = 'components/admin-modals/' + f;
  if (!fs.existsSync(file)) continue;
  let t = fs.readFileSync(file, {encoding:'utf8'});
  t = t.replace(/\\\/g, '\');
  t = t.replace(/\\\$/g, '\$');
  fs.writeFileSync(file, t);
}
