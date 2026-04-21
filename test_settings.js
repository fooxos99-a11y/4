const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('settings').select('*');
  console.log('settings:', data, error);
}
test();