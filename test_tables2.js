const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const url = fs.readFileSync('.env.local', 'utf8').match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = fs.readFileSync('.env.local', 'utf8').match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const { data } = await supabase.from('enrollment_requests').select('*').limit(1);
  console.log('enrollment_requests:', data ? (data.length > 0 ? Object.keys(data[0]) : 'empty table') : 'no table');
}
test();