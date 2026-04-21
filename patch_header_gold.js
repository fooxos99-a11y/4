const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf-8');

const replacement = 'background: "linear-gradient(to right, #D4AF37, #C9A961)",';

// We want to replace the specific index that represents the level bar's fill.
const targetFill = 'background: "linear-gradient(to right, #0f5c5c -80%, #032424 100%)",';

// But wait, the header root background also uses #0f5c5c!
// We only want the second one or the one inside the level bar.
code = code.replace(
  `                        background: "linear-gradient(to right, #0f5c5c -80%, #032424 100%)",
                        borderRadius: "0 100px 100px 0"`,
  `                        background: "linear-gradient(to right, #D4AF37, #C9A961)",
                        borderRadius: "0 100px 100px 0"`
);

code = code.replace(
  `                          color: "#0a4545",`,
  `                          color: "#c99347",` // A slightly darker/defined gold for the text
);

fs.writeFileSync('components/header.tsx', code);
console.log('Header patched');
