const fs = require('fs');
const file = 'app/admin/student-plans/page.tsx';
let data = fs.readFileSync(file, 'utf8');

const oldStructure = `            {/* بداية ونهاية الخطة والمقدار اليومي */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">`;

const newStructure = `            {/* بداية ونهاية الخطة والمقدار اليومي */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col w-full">`;

data = data.replace(oldStructure, newStructure);

const endStartText = `                  </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  نهاية الخطة
                </label>`;

const endNewText = `                  </div>
              </div>
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  نهاية الخطة
                </label>`;

data = data.replace(endStartText, endNewText);


const dailyOldText = `              {/* المقدار اليومي */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  المقدار اليومي`;

const dailyNewText = `            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
            {/* المقدار اليومي */}
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  المقدار اليومي`;

data = data.replace(dailyOldText, dailyNewText);

fs.writeFileSync(file, data);
console.log('Fixed dialog layout.');
