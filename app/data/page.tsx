import { getSupabaseServer } from "@/lib/supabase-server"
import { DataDisplay } from "@/components/data-display"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default async function DataPage() {
  const supabase = await getSupabaseServer()

  // جلب البيانات من جدول - غير اسم الجدول حسب قاعدة بياناتك
  const { data, error } = await supabase
    .from("your_table_name") // غير هذا إلى اسم الجدول الفعلي
    .select("*")
    .order("created_at", { ascending: false })

  console.log("[v0] Fetched data from Supabase:", data)
  console.log("[v0] Error if any:", error)

  return (
    <div className="min-h-screen bg-[#1a2332]" dir="rtl">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 min-h-[60vh]">
          <h1 className="text-3xl font-bold text-[#1a2332] mb-6">البيانات من Supabase</h1>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">خطأ في جلب البيانات: {error.message}</p>
              <p className="text-sm text-red-500 mt-2">تأكد من أن اسم الجدول صحيح في الكود</p>
            </div>
          ) : (
            <DataDisplay data={data || []} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
