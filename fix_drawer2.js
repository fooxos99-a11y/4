const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

const drawerHeaderRegex = /<div className=\"flex items-center justify-between p-6 border-b border-gray-100 bg-\[#00312e\] text-white\">[\s\S]*?<\/button>\s*<\/div>/;

const newHeader = `<div className="h-20 px-4 flex items-center justify-between border-b border-gray-100 bg-[#00312e] text-white relative w-full">
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="flex p-2 z-20 hover:bg-white/10 rounded-full transition-colors order-3"
            >
               <Menu size={32} />
            </button>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex justify-center w-full pointer-events-none">
                <Image 
                  src="/قبس.png" alt="قبس" width={60} height={35} 
                  className="w-16 h-auto cursor-pointer pointer-events-auto" 
                  onClick={() => {
                      handleNav("/");
                      setIsMobileMenuOpen(false);
                  }}
                />
            </div>
          </div>`;

content = content.replace(drawerHeaderRegex, newHeader);
fs.writeFileSync('components/header.tsx', content);
