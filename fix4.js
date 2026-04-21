const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components', 'admin-modals');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const f of files) {
    const file = path.join(dir, f);
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
}
