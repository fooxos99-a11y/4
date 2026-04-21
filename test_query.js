const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
// read env
const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase
        .from('store_orders')
        .select('*, store_products(theme_key)')
        .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data:', data?.length);
}
test();
