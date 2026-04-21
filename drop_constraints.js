const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function run() {
  const q1 = await supabase.from('pathway_levels').select('*').limit(1);
  console.log(q1.error || 'pathway_levels ok');
}
run();
