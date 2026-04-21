const fs = require('fs');
let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

code = code.replace('{planData.has_previous && (', '{ (planData.rabt_pages || planData.muraajaa_pages) && (');

code = code.replace(
  '{Number(planData.rabt_pages) <= 0.334 && Number(planData.rabt_pages) >= 0.332 ? "ثلث وجه يومياً" : Number(planData.rabt_pages) === 0.5 ? "نصف وجه يومياً" : Number(planData.rabt_pages) === 1 ? "وجه يومياً" : Number(planData.rabt_pages) + " أوجه يومياً"}',
  '{Number(planData.rabt_pages) === 10 ? "10 أوجه يومياً" : Number(planData.rabt_pages) === 20 ? "جزء واحد يومياً" : Number(planData.rabt_pages) + " أوجه يومياً"}'
);

code = code.replace(
  '{Number(planData.muraajaa_pages) <= 0.334 && Number(planData.muraajaa_pages) >= 0.332 ? "ثلث وجه يومياً" : Number(planData.muraajaa_pages) === 0.5 ? "نصف وجه يومياً" : Number(planData.muraajaa_pages) === 1 ? "وجه يومياً" : Number(planData.muraajaa_pages) + " أوجه يومياً"}',
  '{Number(planData.muraajaa_pages) === 20 ? "جزء واحد يومياً" : Number(planData.muraajaa_pages) === 40 ? "جزئين يومياً" : Number(planData.muraajaa_pages) === 60 ? "3 أجزاء يومياً" : Number(planData.muraajaa_pages) + " أوجه يومياً"}'
);

fs.writeFileSync('app/profile/page.tsx', code);
console.log('Profile patched properly');
