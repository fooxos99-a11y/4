// check.js
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase environment variables. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

const supabase = createClient(url, key);

async function check() {
  const { count: studentsCount, error: err1 } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: teachersCount, error: err2 } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
  const { count: circlesCount, error: err3 } = await supabase.from('circles').select('*', { count: 'exact', head: true });
  
  console.log('Students:', studentsCount, err1);
  console.log('Teachers:', teachersCount, err2);
  console.log('Circles:', circlesCount, err3);
}

check();
