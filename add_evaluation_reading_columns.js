const { createClient } = require("@supabase/supabase-js")
require("dotenv").config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

async function addEvaluationReadingColumns() {
  const query = `
    ALTER TABLE evaluations
    ADD COLUMN IF NOT EXISTS hafiz_from_surah TEXT,
    ADD COLUMN IF NOT EXISTS hafiz_from_verse TEXT,
    ADD COLUMN IF NOT EXISTS hafiz_to_surah TEXT,
    ADD COLUMN IF NOT EXISTS hafiz_to_verse TEXT,
    ADD COLUMN IF NOT EXISTS samaa_from_surah TEXT,
    ADD COLUMN IF NOT EXISTS samaa_from_verse TEXT,
    ADD COLUMN IF NOT EXISTS samaa_to_surah TEXT,
    ADD COLUMN IF NOT EXISTS samaa_to_verse TEXT,
    ADD COLUMN IF NOT EXISTS rabet_from_surah TEXT,
    ADD COLUMN IF NOT EXISTS rabet_from_verse TEXT,
    ADD COLUMN IF NOT EXISTS rabet_to_surah TEXT,
    ADD COLUMN IF NOT EXISTS rabet_to_verse TEXT;
  `

  console.log("Trying to execute RPC...")
  const { error } = await supabase.rpc("exec_sql", {
    sql: query,
  })

  if (error) {
    console.error("Error altering evaluations table via RPC:", error.message)
    console.log("\nيرجى تنفيذ أمر SQL التالي يدوياً في Supabase:\n")
    console.log(query)
    return
  }

  console.log("✓ تم إضافة أعمدة تفاصيل القراءة لجدول evaluations بنجاح")
}

addEvaluationReadingColumns()