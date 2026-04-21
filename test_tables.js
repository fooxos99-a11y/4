const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const t = ['pathway_contents', 'pathway_level_questions', 'pathway_levels', 'pathway_level_completions'];
  for (let table of t) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) console.error(table, error);
    else console.log(table, data && data.length > 0 ? Object.keys(data[0]) : 'empty');
  }
}
test();