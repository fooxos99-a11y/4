
"use client";
import { SiteLoader } from "@/components/ui/site-loader";
// دالة لتحويل رقم المستوى إلى نص عربي (خارج الكومبوننت)
function getLevelTitle(levelId: number) {
  const titles = [
    "المستوى الأول",
    "المستوى الثاني",
    "المستوى الثالث",
    "المستوى الرابع",
    "المستوى الخامس",
    "المستوى السادس",
    "المستوى السابع",
    "المستوى الثامن",
    "المستوى التاسع",
    "المستوى العاشر"
  ];
  return titles[levelId - 1] || `المستوى ${levelId}`;
}

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";

interface PathwayContent {
  id: number;
  content_type: string;
  content_title: string;
  content_description?: string;
  content_url?: string;
  content_file_name?: string;
}

interface PathwayQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
}

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = params?.id ? Number(params.id) : 1;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [contents, setContents] = useState<PathwayContent[]>([]);
  const [questions, setQuestions] = useState<PathwayQuestion[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number|null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  // النقاط المستحقة من السيرفر بعد إنهاء المستوى
  const [lastAwardedPoints, setLastAwardedPoints] = useState<number>(0);
  // تحقق إذا كان الطالب أكمل هذا المستوى مسبقاً
  useEffect(() => {
    const checkCompletion = async () => {
      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) return;
      const currentUser = JSON.parse(currentUserStr);
      let studentId = localStorage.getItem("studentId");
      // تحقق إذا كان studentId ليس uuid (أي رقم أو نص قصير)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!studentId || !uuidRegex.test(studentId)) {
        // جلب uuid من قاعدة البيانات عبر رقم الحساب
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        let accountNumber = currentUser.account_number || currentUser.id || studentId;
        const { data: studentRow, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("account_number", accountNumber)
          .maybeSingle();
        if (studentRow && studentRow.id) {
          studentId = studentRow.id;
          localStorage.setItem("studentId", studentId as string);
        } else {
          // إذا لم يوجد uuid، أوقف العملية
          alert("تعذر جلب معرف الطالب الصحيح. يرجى إعادة تسجيل الدخول.");
          return;
        }
      }
      console.log("[LEVEL PAGE] studentId (uuid):", studentId, "levelId:", levelId);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data, error } = await supabase
        .from("pathway_level_completions")
        .select("id")
        .eq("student_id", studentId)
        .eq("level_number", levelId)
        .maybeSingle();
      if (data && data.id) {
        alert("لقد أكملت هذا المستوى بالفعل. سيتم إعادتك للمسار.");
        router.push("/pathways");
      }
      if (error) {
        alert("خطأ في التحقق من حالة الإكمال: " + error.message);
      }
    };
    checkCompletion();
  }, [levelId]);

  useEffect(() => {
    setIsLoading(true);
    setError("");
    const currentUserStr = localStorage.getItem("currentUser");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const halaqah = currentUser?.halaqah;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    // جلب محتوى المستوى
    const fetchContents = async () => {
      let query = supabase
        .from("pathway_contents")
        .select("*")
        .eq("level_id", levelId);
      
      if (halaqah) {
        query = query.eq("halaqah", halaqah);
      }
      
      const { data, error } = await query.order("id", { ascending: true });
      if (error) {
        setError("خطأ في جلب محتوى المستوى");
        setContents([]);
      } else {
        setContents(data || []);
      }
    };
    // جلب أسئلة المستوى
    const fetchQuestions = async () => {
      let query = supabase
        .from("pathway_level_questions")
        .select("*")
        .eq("level_number", levelId);
        
      if (halaqah) {
        query = query.eq("halaqah", halaqah);
      }
      
      const { data, error } = await query.order("id", { ascending: true });
      if (error) {
        setError("خطأ في جلب أسئلة المستوى");
        setQuestions([]);
      } else {
        setQuestions(data || []);
      }
    };
    Promise.all([fetchContents(), fetchQuestions()]).finally(() => setIsLoading(false));
  }, [levelId]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7e9d7] to-[#e3f6f5] flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-extrabold mb-10 text-center text-[#20335f] drop-shadow-lg">{getLevelTitle(levelId)}</h1>
      <div className="w-full flex justify-center items-start">
        <div className="w-full max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <SiteLoader size="lg" color="#3453a7" />
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 rounded-lg p-4 text-center font-bold shadow">{error}</div>
        ) : (
          <>
            {alreadyCompleted ? (
              <div className="flex flex-col items-center justify-center bg-[#faf9f6] rounded-2xl shadow-2xl p-12 mb-8 border-2 border-[#3453a7]/30 animate-fade-in">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#3453a7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="mb-6 drop-shadow-lg"><circle cx="12" cy="12" r="10" stroke="#3453a7" strokeWidth="3.5" fill="#fff7e6"/><polyline points="17 8 11 16 7 12" stroke="#3453a7" strokeWidth="3.5" fill="none"/></svg>
                <div className="text-4xl font-extrabold mb-2 text-[#20335f]">{(typeof lastAwardedPoints === 'number' && lastAwardedPoints > 0) ? lastAwardedPoints : 0}</div>
                <div className="text-lg font-bold text-[#3453a7]">نقاط المسار المكتسبة</div>
              </div>
            ) : (
              !showQuiz && !quizDone && (
                <div className="flex justify-center mb-10">
                  <div className="w-full max-w-xl">
                    {contents.length === 0 ? (
                      <div className="text-center text-gray-500 bg-white rounded-2xl p-12 shadow text-xl">لا يوجد محتوى لهذا المستوى.</div>
                    ) : (
                      contents.map((content) => (
                        <div key={content.id} className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-start border-2 border-[#3453a7]/20 hover:shadow-2xl transition mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#3453a7] text-3xl">★</span>
                            <span className="font-bold text-2xl text-[#20335f]">{content.content_title}</span>
                          </div>
                          {content.content_description && <div className="text-gray-600 mb-4 text-lg">{content.content_description}</div>}
                          {content.content_url && (
                            <div className="w-full mt-4 flex justify-center">
                              {content.content_type === "video" || content.content_type?.includes("video") || content.content_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                <video controls className="w-full max-h-[400px] rounded-lg shadow-md">
                                  <source src={content.content_url} type="video/mp4" />
                                  متصفحك لا يدعم تشغيل الفيديو.
                                </video>
                              ) : content.content_type === "image" || content.content_type?.includes("image") || content.content_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <img src={content.content_url} alt={content.content_title} className="max-w-full max-h-[400px] rounded-lg shadow-md object-contain" />
                              ) : content.content_type === "pdf" || content.content_type?.includes("pdf") || content.content_url.match(/\.pdf$/i) ? (
                                <iframe src={`${content.content_url}#toolbar=0`} className="w-full h-[500px] rounded-lg shadow-md border-0" title={content.content_title} />
                              ) : (
                                <iframe src={content.content_url} className="w-full h-[500px] rounded-lg shadow-md border-0" title={content.content_title} />
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            )}
            {/* زر بدء الاختبار */}
            {!showQuiz && !quizDone && questions.length > 0 && !alreadyCompleted && (
              <div className="flex justify-center mb-8">
                <Button onClick={() => setShowQuiz(true)} className="bg-[#3453a7] hover:bg-[#eab676] text-[#20335f] font-extrabold px-16 py-5 text-2xl rounded-full shadow-2xl transition">ابدأ الاختبار</Button>
              </div>
            )}
            {/* عرض الأسئلة */}
            {showQuiz && !quizDone && questions.length > 0 && !alreadyCompleted && (
              <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border-2 border-[#20335f]/10">
                {/* حذف نص سؤال 1 من 2 */}
                <div className="mb-4 text-lg text-[#3453a7] text-center font-bold">{questions[currentQuestion].question}</div>
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((opt, idx) => (
                    <Button
                      key={idx}
                      variant={answers[currentQuestion] === idx ? "default" : "outline"}
                      className={`w-full text-right text-lg font-bold ${answers[currentQuestion] === idx ? "bg-[#3453a7] text-[#20335f] border-[#3453a7] rounded-full shadow-lg hover:bg-[#3453a7] focus:bg-[#3453a7] active:bg-[#3453a7]" : "border-[#20335f]/20"}`}
                      onClick={() => {
                        const newAnswers = [...answers];
                        newAnswers[currentQuestion] = idx;
                        setAnswers(newAnswers);
                      }}
                      disabled={isSubmitting}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-end mt-8">
                  {/* حذف زر السابق */}
                  {currentQuestion < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestion((q) => q + 1)}
                      disabled={typeof answers[currentQuestion] === "undefined" || isSubmitting}
                      className="bg-[#3453a7] text-[#20335f] font-bold px-8 py-3 rounded-full shadow-lg transition hover:bg-[#3453a7] focus:bg-[#3453a7] active:bg-[#3453a7]"
                    >التالي</Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        setIsSubmitting(true);
                        let correct = 0;
                        questions.forEach((q, idx) => {
                          if (answers[idx] === q.correct_answer) correct++;
                        });
                        setScore(correct);
                        try {
                          const currentUserStr = localStorage.getItem("currentUser");
                          let studentId = null;
                          if (currentUserStr) {
                            const currentUser = JSON.parse(currentUserStr);
                            studentId = localStorage.getItem("studentId") || currentUser.id;
                            if (!studentId && currentUser.account_number) {
                              const supabase = createBrowserClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                              );
                              const { data: studentRow } = await supabase
                                .from("students")
                                .select("id")
                                .eq("account_number", currentUser.account_number)
                                .maybeSingle();
                              if (studentRow && studentRow.id) {
                                studentId = studentRow.id;
                                localStorage.setItem("studentId", studentId);
                              }
                            }
                            if (studentId) {
                              // أرسل عدد الإجابات الصحيحة وإجمالي الأسئلة مع الطلب
                              const res = await fetch("/api/pathways/complete-level", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  student_id: studentId,
                                  level_number: levelId,
                                  correct_count: correct,
                                  total_count: questions.length
                                }),
                              });
                              const result = await res.json();
                              if (!result.success) {
                                alert("لم يتم تسجيل إكمال المستوى! " + (result.error || ""));
                              } else {
                                setAlreadyCompleted(true);
                                if (typeof result.points === 'number' && result.points > 0) {
                                  setLastAwardedPoints(result.points);
                                } else {
                                  setLastAwardedPoints(0);
                                }
                              }
                            }
                          }
                        } catch (e) {}
                        setIsSubmitting(false);
                        setQuizDone(true);
                        // ضع علامة في localStorage ليعرف المسار أنه يجب إعادة التحميل
                        localStorage.setItem("levelCompleted", "true");
                        setTimeout(() => {
                          router.push("/pathways");
                        }, 2000);
                      }}
                      disabled={typeof answers[currentQuestion] === "undefined" || isSubmitting}
                      className="bg-[#3453a7] hover:bg-[#eab676] text-[#20335f] font-bold px-8 py-3 rounded-full shadow-lg"
                    >إنهاء الاختبار</Button>
                  )}
                </div>
              </div>
            )}
            {/* نتيجة الاختبار */}
            {quizDone && !alreadyCompleted && (
              <div className="flex flex-col items-center justify-center bg-[#faf9f6] rounded-2xl shadow-2xl p-12 mb-8 border-2 border-[#3453a7]/30 animate-fade-in">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#3453a7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="mb-6 drop-shadow-lg"><circle cx="12" cy="12" r="10" stroke="#3453a7" strokeWidth="3.5" fill="#fff7e6"/><polyline points="17 8 11 16 7 12" stroke="#3453a7" strokeWidth="3.5" fill="none"/></svg>
                <div className="text-4xl font-extrabold mb-2 text-[#20335f]">{(quizDone && typeof lastAwardedPoints === 'number' && lastAwardedPoints > 0) ? lastAwardedPoints : 0}</div>
                <div className="text-lg font-bold text-[#3453a7]">نقاط المسار المكتسبة</div>
              </div>
            )}
          </>
        )}
        {/* <Footer /> */}
        </div>
      </div>
    </main>
  );
}
