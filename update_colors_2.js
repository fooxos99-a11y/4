const fs = require('fs');
let c = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Restore the header's dark gradient (undoing the bright cyan on the header)
c = c.replace(
  'style={{ background: "linear-gradient(to right, #4adac1, #1bbbbb)" }}',
  'style={{ background: "linear-gradient(to right, #0f5c5c -80%, #032424 100%)" }}'
);

// 2. Apply the dark gradient to the PROGRESS BAR filling itself (which currently has the bright cyan)
// We use 'to bottom' because the progress bar typically has a vertical shine/gradient or horizontal.
// Wait, the progress bar originally had "linear-gradient(to bottom, #4adac1, #1bbbbb)"
c = c.replace(
  'background: "linear-gradient(to bottom, #4adac1, #1bbbbb)"',
  'background: "linear-gradient(to bottom, #0f5c5c, #032424)"'
);

// 3. Just in case it's 'to right' somehow:
c = c.replace(
  'background: "linear-gradient(to right, #4adac1, #1bbbbb)"',
  'background: "linear-gradient(to right, #0f5c5c, #032424)"'
);

fs.writeFileSync('components/header.tsx', c);
console.log('Done replacing colors.');
