const { execSync } = require('child_process');
try {
  console.log(execSync('git diff HEAD components/header.tsx').toString());
} catch(e) {
  console.log(e.toString());
}
