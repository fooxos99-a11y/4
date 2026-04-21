const fs = require('fs');

let code = fs.readFileSync('components/header.tsx', 'utf-8');

const targetFill = 'background: "linear-gradient(to right, #0f5c5c -80%, #032424 100%)",';
const replacement = 'background: "linear-gradient(to right, #D4AF37, #C9A961)",';

let segments = code.split('/* التعبئة السماوية - من اليسار لليمين */');

if (segments.length === 2) {
    let replacedBottom = segments[1].replace(targetFill, replacement);
    code = segments[0] + '/* التعبئة السماوية - من اليسار لليمين */' + replacedBottom;
    fs.writeFileSync('components/header.tsx', code);
    console.log('patched header correctly');
} else {
    console.log('could not split properly');
}
