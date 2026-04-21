const fs = require('fs');

let code = fs.readFileSync('components/header.tsx', 'utf8');

// Remove import
code = code.replace(/import\s+{\s*GlobalAdminModals\s*}\s*from\s*(["'])@\/components\/global-admin-modals\1;?/g, '');

// Remove render
code = code.replace(/<GlobalAdminModals\s*\/>/g, '');

fs.writeFileSync('components/header.tsx', code);
console.log('Fixed double modals in Header');
