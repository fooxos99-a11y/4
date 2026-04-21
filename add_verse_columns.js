const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function alterPlansTable() {
  const query = `
      ALTER TABLE student_plans
      ADD COLUMN IF NOT EXISTS start_verse INT,
      ADD COLUMN IF NOT EXISTS end_verse INT,
      ADD COLUMN IF NOT EXISTS prev_start_verse INT,
      ADD COLUMN IF NOT EXISTS prev_end_verse INT;
    `;
    
  console.log("Trying to execute RPC...");
  const { error } = await supabase.rpc("exec_sql", {
    sql: query,
  });

  if (error) {
    console.error("Error altering table via RPC:", error.message)
    console.log("\nيرجى تنفيذ أمر SQL التالي يدوياً في Supabase:\n")
    console.log(query)
  } else {
    console.log("✓ تم إضافة الأعمدة الجديدة لجدول student_plans بنجاح")
  }
}

alterPlansTable()