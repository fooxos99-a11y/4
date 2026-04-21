// check2.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function check() {
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: teachersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
  const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: circlesCount } = await supabase.from('circles').select('*', { count: 'exact', head: true });
  
  console.log('Total Users:', usersCount);
  console.log('Teachers (in users):', teachersCount);
  console.log('Students:', studentsCount);
  console.log('Circles:', circlesCount);
}

check();
