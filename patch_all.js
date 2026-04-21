const fs = require('fs');
let content = fs.readFileSync('app/students/all/page.tsx', 'utf8');

// 1. Add states
content = content.replace(
  'const [loading, setLoading] = useState(true)',
  'const [loading, setLoading] = useState(true)\n  const [isAutoScrolling, setIsAutoScrolling] = useState(false)'
);

// 2. Add effect
const effectCode = \
  useEffect(() => {
    if (!isAutoScrolling) return;

    let animationFrameId;
    let scrollDirection = 1;

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1;
      } else if (scrollTop <= 0) {
        scrollDirection = 1;
      }
      
      window.scrollBy(0, scrollDirection * 1);
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling]);
\;
content = content.replace(
  'useEffect(() => {',
  effectCode + '\n\n  useEffect(() => {'
);


// 3. Header/Footer conditionally
content = content.replace(/<Header \/>/g, '{!isAutoScrolling && <Header />}');
content = content.replace(/<Footer \/>/g, '{!isAutoScrolling && <Footer />}');

// 4. Add the Presentation Button at the end before </div> }
const buttonCode = \
      {/* ??? ???? ?????? */}
      <button 
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={\\\ixed bottom-6 left-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center \\\\\\}
        title={isAutoScrolling ? '????? ?????? ????????' : '????? ?????? ????????'}
      >
        {isAutoScrolling ? <X size={24} /> : <MonitorPlay size={24} />}
      </button>
\;

content = content.replace(/\\{!isAutoScrolling && <Footer \\/>\\}\\s*<\\/div>\\s*\\)\\s*\\}/, buttonCode + '\n{!isAutoScrolling && <Footer />}\n    </div>\n  )\n}');

if (!content.includes('MonitorPlay')) {
   content = content.replace('Award, Calendar, Diamond, Star, Zap, Crown', 'Award, Calendar, Diamond, Star, Zap, Crown, MonitorPlay, X');
}

fs.writeFileSync('app/students/all/page.tsx', content);
console.log('patched all');

