const fs = require('fs');

const filesToPatch = [
  'app/students/all/page.tsx',
  'app/halaqat/[circleName]/page.tsx',
  'app/halaqat/musab/page.tsx'
];

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace the effect
  const newEffect = \  useEffect(() => {
    if (!isAutoScrolling) return;

    let animationFrameId: number;
    let scrollDirection = 1;
    let currentY = window.scrollY; // Track accurate floating point Y position

    const scrollStep = () => {\n\ +
\      const { scrollHeight, clientHeight } = document.documentElement;

      if (currentY + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1;
      } else if (currentY <= 0) {
        scrollDirection = 1;
      }

      currentY += scrollDirection * 0.5;
      window.scrollTo(0, currentY);
      
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling]);\;

  // We need to replace the old use effect. 
  // We'll use a regex to match the old useEffect.
  content = content.replace(/useEffect\\(\\(\\) => \\{[\\s\\S]*?window\\.scrollBy[\\s\\S]*?cancelAnimationFrame\\(animationFrameId\\);[\\s\\S]*?\\}, \\\[isAutoScrolling\\\]\\);/, newEffect);

  fs.writeFileSync(filePath, content);
  console.log('Fixed scroll logic in ' + filePath);
});

