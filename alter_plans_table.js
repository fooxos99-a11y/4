const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function alterPlansTable() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE student_plans 
      ADD COLUMN IF NOT EXISTS has_previous BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS prev_start_surah INT,
      ADD COLUMN IF NOT EXISTS prev_end_surah INT,
      ADD COLUMN IF NOT EXISTS rabt_pages NUMERIC(3,1),
      ADD COLUMN IF NOT EXISTS muraajaa_pages NUMERIC(3,1);
    `,
  })

  if (error) {
    console.error("Error altering table via RPC:", error.message)
    console.log("\nيرجى تنفيذ أمر SQL التالي يدوياً في Supabase:\n")
    console.log(`
      ALTER TABLE student_plans 
      ADD COLUMN IF NOT EXISTS has_previous BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS prev_start_surah INT,
      ADD COLUMN IF NOT EXISTS prev_end_surah INT,
      ADD COLUMN IF NOT EXISTS rabt_pages NUMERIC(3,1),
      ADD COLUMN IF NOT EXISTS muraajaa_pages NUMERIC(3,1);
    `)
  } else {
    console.log("✓ تم إضافة الأعمدة الجديدة لجدول student_plans بنجاح")
  }
}

alterPlansTable()
