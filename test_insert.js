const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('pathway_levels').insert({ level_number: 9999, title: 'test', points: 100, is_locked: false });
  console.log('Insert1:', error?.message || 'Success');
  const { data: d2, error: e2 } = await supabase.from('pathway_levels').insert({ level_number: 9999, title: 'test2', points: 100, is_locked: false });
  console.log('Insert2:', e2?.message || 'Success');
  await supabase.from('pathway_levels').delete().eq('level_number', 9999);
}
test();
