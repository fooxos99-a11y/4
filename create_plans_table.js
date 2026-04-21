/**
 * إنشاء جدول student_plans في Supabase
 * قم بتشغيل هذا الملف مرة واحدة لإنشاء الجدول
 * 
 * التشغيل: node create_plans_table.js
 */

const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // استخدم service role key
)

async function createPlansTable() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS student_plans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id UUID NOT NULL,
        start_surah_number INT NOT NULL,
        start_surah_name TEXT NOT NULL,
        end_surah_number INT NOT NULL,
        end_surah_name TEXT NOT NULL,
        daily_pages NUMERIC(3,1) NOT NULL DEFAULT 1.0,
        total_pages NUMERIC(6,1) NOT NULL,
        total_days INT NOT NULL,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS student_plans_student_id_idx ON student_plans(student_id);
    `,
  })

  if (error) {
    console.error("Error creating table via RPC:", error.message)
    console.log("\nإذا فشل الأمر، يرجى تنفيذ الـ SQL التالي مباشرة في Supabase SQL Editor:\n")
    console.log(`
CREATE TABLE IF NOT EXISTS student_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  start_surah_number INT NOT NULL,
  start_surah_name TEXT NOT NULL,
  end_surah_number INT NOT NULL,
  end_surah_name TEXT NOT NULL,
  daily_pages NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  total_pages NUMERIC(6,1) NOT NULL,
  total_days INT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_plans_student_id_idx ON student_plans(student_id);

-- السماح بالقراءة والكتابة (Row Level Security)
ALTER TABLE student_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_plans" ON student_plans FOR ALL USING (true) WITH CHECK (true);
    `)
  } else {
    console.log("✓ تم إنشاء جدول student_plans بنجاح")
  }
}

createPlansTable()
