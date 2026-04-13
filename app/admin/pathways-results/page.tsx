"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, BookOpen, Trophy, Users } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function PathwaysResultsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المسار");

  const [levels, setLevels] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>("")
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchCircles()
  }, [])

  useEffect(() => {
    if (selectedHalaqah) loadLevels()
  }, [selectedHalaqah])

  useEffect(() => {
    if (selectedLevel) {
      loadResults(selectedLevel)
    } else {
      setResults([])
    }
  }, [selectedLevel])

  async function fetchCircles() {
    try {
      const res = await fetch('/api/circles');
      const data = await res.json();
      if (data.circles) {
        setCircles(data.circles);
        if (data.circles.length > 0) setSelectedHalaqah(data.circles[0].name);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadLevels() {
    if (!selectedHalaqah) return;
    setIsLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from("pathway_levels")
      .select("level_number, title")
      .eq("halaqah", selectedHalaqah)
      .order("level_number")
    setLevels(data || [])
    if (data && data.length > 0) {
      setSelectedLevel(String(data[0].level_number))
    } else {
      setSelectedLevel("")
    }
    setIsLoading(false)
  }

  async function loadResults(levelNumber: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from("pathway_level_completions")
      .select("id, student_id, points, level_number, students(name)")
      .eq("level_number", levelNumber)
    if (error) {
      setResults([])
      return
    }
    const mapped = (data || []).map((r: any) => ({
      id: r.id,
      student_id: r.student_id,
      points: r.points,
      student_name: r.students?.name || "-",
    }))
    setResults(mapped)
  }

  const selectedLevelTitle = levels.find((l) => String(l.level_number) === selectedLevel)?.title || ""

  if (isLoading) {
    return <SiteLoader fullScreen />
  }

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Page Header */}
          <div className="flex items-center justify-between border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg border border-[#3453a7]/40 flex items-center justify-center text-[#4f73d1] hover:bg-[#3453a7]/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#3453a7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">نتائج المسار</h1>
            </div>
          </div>

          {/* Halaqah Selector */}
          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#3453a7]/20">
              <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#3453a7]" />
              </div>
              <h2 className="text-base font-bold text-[#1a2332]">اختر الحلقة</h2>
            </div>
            <Select value={selectedHalaqah} onValueChange={(val) => { setSelectedHalaqah(val); setSelectedLevel(''); }}>
              <SelectTrigger className="w-full sm:w-72 border-[#3453a7]/40 text-[#1a2332] rounded-xl h-11 focus:ring-[#3453a7]/30">
                <SelectValue placeholder="اختر الحلقة" />
              </SelectTrigger>
              <SelectContent>
                {circles.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level Selector */}
          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#3453a7]/20">
              <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#3453a7]" />
              </div>
              <h2 className="text-base font-bold text-[#1a2332]">اختر المستوى</h2>
            </div>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-full sm:w-72 border-[#3453a7]/40 text-[#1a2332] rounded-xl h-11 focus:ring-[#3453a7]/30">
                <SelectValue placeholder="اختر المستوى" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((level) => (
                  <SelectItem key={level.level_number} value={String(level.level_number)}>
                    {level.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#3453a7]/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#3453a7]" />
              </div>
              <h2 className="text-base font-bold text-[#1a2332]">
                {selectedLevelTitle ? `نتائج: ${selectedLevelTitle}` : "النتائج"}
              </h2>
              {results.length > 0 && (
                <span className="mr-auto text-sm text-neutral-400">{results.length} طالب</span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-7 h-7 text-[#3453a7]" />
                </div>
                <p className="text-lg font-semibold text-neutral-500">لا يوجد طلاب اختبروا هذا المستوى بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-[#3453a7]/20">
                {/* Table Head */}
                <div className="grid grid-cols-2 px-6 py-3 bg-[#3453a7]/5">
                  <span className="text-sm font-semibold text-[#1a2332]/60">اسم الطالب</span>
                  <span className="text-sm font-semibold text-[#1a2332]/60 text-center">النقاط</span>
                </div>
                {results.map((r, index) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-2 px-6 py-4 hover:bg-[#3453a7]/3 transition-colors items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#4f73d1]">{index + 1}</span>
                      </div>
                      <span className="text-sm font-bold text-[#1a2332]">{r.student_name}</span>
                    </div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/30 text-sm font-bold text-[#4f73d1]">
                        {r.points}
                        <Trophy className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
