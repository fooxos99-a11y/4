"use client";
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Trash2, BookOpen, LayoutGrid } from "lucide-react"; // تأكد من تثبيت lucide-react
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"

const ARABIC_LETTERS = [
  "أ","ب","ت","ث","ج","ح","خ","د","ذ","ر","ز","س","ش","ص","ض","ط","ظ","ع","غ","ف","ق","ك","ل","م","ن","هـ","و","ي"
];

export default function LetterHiveQuestionsAdmin() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة خلية الحروف");

  const [questions, setQuestions] = useState<Record<string, {question: string, answer: string}[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const PRIMARY_COLOR = "#cc994b";

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("letter_hive_questions").select();
    if (!error && data) {
      const grouped: Record<string, {question: string, answer: string}[]> = {};
      for (const row of data) {
        if (!grouped[row.letter]) grouped[row.letter] = [];
        grouped[row.letter].push({ question: row.question, answer: row.answer });
      }
      setQuestions(grouped);
    }
    setLoading(false);
  }

  async function addQuestion() {
    if (!selectedLetter || !newQuestion || !newAnswer) return;
    const supabase = createClient();
    const { error } = await supabase.from("letter_hive_questions").insert({ 
        letter: selectedLetter, 
        question: newQuestion, 
        answer: newAnswer 
    });
    if (!error) {
      setNewQuestion("");
      setNewAnswer("");
      fetchQuestions();
    }
  }

  async function deleteQuestion(letter: string, question: string) {
    const supabase = createClient();
    await supabase.from("letter_hive_questions").delete().eq("letter", letter).eq("question", question);
    fetchQuestions();
  }

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <div className="flex-1 bg-[#faf9f6] text-[#3d3d3d] p-4 md:p-8 font-sans">
      {/* Header Section */}
      <header className="max-w-6xl mx-auto mb-12 text-center">
        <div className="inline-block p-3 rounded-full bg-[#cc994b]/10 mb-4">
            <LayoutGrid size={40} color={PRIMARY_COLOR} />
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tight">إدارة خلية الحروف</h1>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Letters Selection Grid */}
        <section className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-8 rounded-full bg-[#cc994b]"></span>
            اختر الحرف
          </h2>
          
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
            {ARABIC_LETTERS.map((ltr) => (
              <button
                key={ltr}
                onClick={() => setSelectedLetter(ltr)}
                className={`
                  aspect-square flex items-center justify-center text-xl font-bold rounded-xl transition-all duration-300
                  ${selectedLetter === ltr 
                    ? "bg-[#cc994b] text-white scale-110 shadow-lg shadow-[#cc994b]/40" 
                    : "bg-gray-50 text-gray-400 hover:bg-[#cc994b]/10 hover:text-[#cc994b]"}
                `}
              >
                {ltr}
              </button>
            ))}
          </div>
        </section>

        {/* Questions Management Area */}
        <section className="lg:col-span-7 space-y-6">
          {!selectedLetter ? (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
              <BookOpen size={64} className="mb-4 opacity-20" />
              <p className="text-xl">يرجى اختيار حرف من القائمة للبدء</p>
            </div>
          ) : (
            <>
              {/* Add New Question Form */}
              <div className="rounded-3xl border border-[#cc994b]/20 bg-white p-6 shadow-xl shadow-[#cc994b]/8">
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#cc994b]/12 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#1f2937] flex items-center gap-2">
                      <span className="w-2 h-8 rounded-full bg-[#cc994b]"></span>
                      إضافة سؤال جديد
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cc994b]/10 text-[#cc994b]">
                    <Plus size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_auto] lg:items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#374151]">السؤال</label>
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={e => setNewQuestion(e.target.value)}
                      placeholder="اكتب السؤال هنا..."
                      className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf8] px-4 py-3 text-[#1f2937] placeholder:text-gray-400 outline-none transition-all focus:border-[#cc994b]/60 focus:bg-white focus:ring-4 focus:ring-[#cc994b]/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#374151]">الإجابة</label>
                    <input
                      type="text"
                      value={newAnswer}
                      onChange={e => setNewAnswer(e.target.value)}
                      placeholder="اكتب الإجابة"
                      className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf8] px-4 py-3 text-[#1f2937] placeholder:text-gray-400 outline-none transition-all focus:border-[#cc994b]/60 focus:bg-white focus:ring-4 focus:ring-[#cc994b]/10"
                    />
                  </div>

                  <button 
                    onClick={addQuestion}
                    className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#cc994b] px-6 font-bold text-white shadow-lg shadow-[#cc994b]/20 transition-all hover:-translate-y-0.5 hover:bg-[#c08c3b] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!selectedLetter || !newQuestion || !newAnswer}
                  >
                    <Plus size={18} />
                    إضافة
                  </button>
                </div>
              </div>

              {/* List of Questions */}
              <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 min-h-[400px]">
                <h3 className="text-xl font-bold mb-6 text-gray-700">الأسئلة الحالية</h3>
                
                {loading ? (
                  <div className="flex justify-center py-12">
                    <SiteLoader />
                  </div>
                ) : (questions[selectedLetter] || []).length === 0 ? (
                  <p className="text-center py-12 text-gray-400">لا توجد أسئلة مضافة لهذا الحرف بعد.</p>
                ) : (
                  <div className="space-y-4">
                    {(questions[selectedLetter] || []).map((q, idx) => (
                      <div key={idx} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#cc994b]/30 transition-all">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-[#cc994b] uppercase tracking-wider">السؤال:</span>
                          <span className="text-lg text-gray-800 font-medium">{q.question}</span>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="bg-[#cc994b]/10 text-[#cc994b] text-xs px-2 py-1 rounded-md font-bold">الإجابة: {q.answer}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteQuestion(selectedLetter, q.question)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={22} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      </div>

      <Footer />
    </div>
  );
}