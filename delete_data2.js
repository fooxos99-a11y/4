// delete_data2.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function clearData() {
  console.log('1. Deleting students...');
  const { data: st, error: e1 } = await supabase.from('students').delete().neq('name', 'dummy_no_match');
  if (e1) console.error('Error deleting students:', e1);
  else console.log('Students deleted.');

  console.log('2. Deleting teachers (users where role=teacher)...');
  const { error: e2 } = await supabase.from('users').delete().eq('role', 'teacher');
  if (e2) console.error('Error deleting teachers:', e2);
  else console.log('Teachers deleted.');

  console.log('3. Deleting circles...');
  const { error: e3 } = await supabase.from('circles').delete().neq('name', 'dummy_no_match');
  if (e3) console.error('Error deleting circles:', e3);
  else console.log('Circles deleted.');
  
  console.log('Done!');
}

clearData();
