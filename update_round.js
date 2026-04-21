const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf-8');

const outerTarget = 'clipPath: "polygon(0 0, calc(100% - 12px) 0, calc(100% - 2px) 43%, 100% 48%, 100% 52%, calc(100% - 2px) 57%, calc(100% - 12px) 100%, 0 100%)"';
const outerReplacement = 'borderRadius: "0 100px 100px 0"';
code = code.replace(new RegExp(outerTarget.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), outerReplacement);

const innerTarget = 'clipPath: "polygon(0 0, calc(100% - 10px) 0, calc(100% - 1.5px) 41%, 100% 47%, 100% 53%, calc(100% - 1.5px) 59%, calc(100% - 10px) 100%, 0 100%)"';
const innerReplacement = 'borderRadius: "0 100px 100px 0"';
code = code.replace(new RegExp(innerTarget.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), innerReplacement);

fs.writeFileSync('components/header.tsx', code);
console.log('Update complete.');