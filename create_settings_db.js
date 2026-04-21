const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS site_settings (
        id text PRIMARY KEY,
        value jsonb
      );
      INSERT INTO site_settings (id, value) VALUES ('enrollment', '{"is_open": true}') ON CONFLICT (id) DO NOTHING;
    `
  });
  console.log(error || 'success');
}
run();
