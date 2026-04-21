"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, Check } from "lucide-react"

type DBQuestion = {
  id: string
  category_id: string
  question: string
  answer: string
  points: number
  answered?: boolean
  answeredBy?: string | null
}

type DBCategory = {
  id: string
  name: string
  questions: DBQuestion[]
}

type GameQuestion = {
  id: string
  points: number
  question: string
  answer: string
  answered: boolean
  answeredBy: string | null
}

type GameCategory = {
  id: string
  name: string
  questions: GameQuestion[]
}

export default function CategoriesGame() {
  const [step, setStep] = useState<"teams" | "categories" | "game">("teams")
  const [teamNames, setTeamNames] = useState(["", ""])
  const [teamScores, setTeamScores] = useState([0, 0])
  const [allCategories, setAllCategories] = useState<DBCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [gameCategories, setGameCategories] = useState<GameCategory[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<GameQuestion | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [editingTeam, setEditingTeam] = useState<number | null>(null)
  const [editScore, setEditScore] = useState("")
  const [currentTurn, setCurrentTurn] = useState(0)
  const [loading, setLoading] = useState(true)
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerActive, setTimerActive] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchUsedQuestions()
  }, [])

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false)
    }
  }, [timerActive, timeLeft])

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false)
    }
  }, [timerActive, timeLeft])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setAllCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setAllCategories([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUsedQuestions = async () => {
    try {
      const response = await fetch("/api/used-questions?gameType=categories")
      if (!response.ok) {
        setUsedQuestionIds([])
        return
      }
      const data = await response.json()
      setUsedQuestionIds(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching used questions:", error)
      setUsedQuestionIds([])
    }
  }

  const markQuestionAsUsed = async (questionId: string) => {
    try {
      await fetch("/api/used-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "categories", questionId })
      })
    } catch (error) {
      console.error("Error marking question as used:", error)
    }
  }


  // إعادة تعيين الأسئلة المستخدمة عند بدء لعبة جديدة أو الخروج
  const resetUsedQuestions = async () => {
    try {
      await fetch("/api/used-questions?gameType=categories", {
        method: "DELETE"
      });
      setUsedQuestionIds([]);
    } catch (error) {
      console.error("Error resetting used questions:", error);
    }
  }

  const handleTeamsSubmit = () => {
    const validNames = teamNames.filter((name) => (name || "").trim())
    if (validNames.length >= 2) {
      setTeamNames(validNames)
      setTeamScores(Array(validNames.length).fill(0))
      setStep("categories")
    }
  }

  const toggleCategorySelection = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== categoryId))
    } else if (selectedCategoryIds.length < 4) {
      setSelectedCategoryIds([...selectedCategoryIds, categoryId])
    }
  }

  const startGame = () => {
    const usedIds = Array.isArray(usedQuestionIds) ? usedQuestionIds : []
    // دالة خلط مصفوفة
    function shuffle(arr: any[]) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const selected = allCategories
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .map(cat => {
        const availableQuestions = cat.questions.filter(q => !usedIds.includes(q.id))
        // تصنيف الأسئلة حسب النقاط
        const q200 = shuffle(availableQuestions.filter(q => q.points === 200))
        const q400 = shuffle(availableQuestions.filter(q => q.points === 400))
        const q600 = shuffle(availableQuestions.filter(q => q.points === 600))
        // اختيار اثنين 200، اثنين 400، واحد 600 بشكل عشوائي
        const selectedQuestions = [
          ...(q200.slice(0, 2)),
          ...(q400.slice(0, 2)),
          ...(q600.slice(0, 1))
        ].map(q => ({
          ...q,
          answered: false,
          answeredBy: null
        }))
        return {
          id: cat.id,
          name: cat.name,
          questions: selectedQuestions
        }
      })
    
    setGameCategories(selected)
    setStep("game")
  }

  const handleQuestionClick = (categoryId: string, question: GameQuestion) => {
    if (!question.answered) {
      setSelectedCategoryId(categoryId)
      setSelectedQuestion(question)
      setShowAnswer(false)
      setTimeLeft(60)
      setTimerActive(true)
    }
  }

  const handleCorrectAnswer = (team: number | "none") => {
    if (selectedQuestion && selectedCategoryId !== null) {
      if (team !== "none") {
        const newScores = [...teamScores]
        newScores[team] += selectedQuestion.points
        setTeamScores(newScores)
      }
      // إضافة السؤال للأسئلة المستخدمة
      const newUsedQuestions = [...usedQuestionIds, selectedQuestion.id]
      setUsedQuestionIds(newUsedQuestions)
      markQuestionAsUsed(selectedQuestion.id)
      setGameCategories(prev =>
        prev.map(cat =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                questions: cat.questions.map(q =>
                  q.id === selectedQuestion.id
                    ? {
                        ...q,
                        answered: true,
                        answeredBy:
                          team !== "none"
                            ? teamNames[team]
                            : "لا أحد",
                      }
                    : q
                ),
              }
            : cat
        )
      )
      // توزيع الدور بالتسلسل بين الفرق
      setCurrentTurn((prev) => (prev + 1) % teamNames.length)
      setSelectedQuestion(null)
      setSelectedCategoryId(null)
      setShowAnswer(false)
      setTimerActive(false)
    }
  }

  const handleEditScore = (teamIdx: number) => {
    setEditingTeam(teamIdx)
    setEditScore(teamScores[teamIdx]?.toString() || "0")
  }

  const handleSaveScore = () => {
    const newScore = parseInt(editScore) || 0
    if (editingTeam !== null && editingTeam >= 0 && editingTeam < teamScores.length) {
      const newScores = [...teamScores]
      newScores[editingTeam] = newScore
      setTeamScores(newScores)
    }
    setEditingTeam(null)
    setEditScore("")
  }

  const handleCancelEdit = () => {
    setEditingTeam(null)
    setEditScore("")
  }

  // صفحة إدخال أسماء الفرق
  if (step === "teams") {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border-2 border-[#3453a7]/20">
            <h1 className="text-2xl sm:text-4xl font-bold text-center mb-4 sm:mb-8 text-[#1a2332] bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent">
              لعبة الفئات
            </h1>
            <div className="space-y-6">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx}>
                  <Label htmlFor={`team${idx + 1}`} className="text-lg font-semibold text-[#1a2332]">
                    اسم الفريق {idx + 1} {idx < 2 ? "(إجباري)" : "(اختياري)"}
                  </Label>
                  <Input
                    id={`team${idx + 1}`}
                    value={teamNames[idx] || ""}
                    onChange={(e) => {
                      const newNames = [...teamNames]
                      newNames[idx] = e.target.value
                      setTeamNames(newNames)
                    }}
                    placeholder={`أدخل اسم الفريق ${idx + 1}`}
                    className="mt-2 text-lg border-2 border-[#3453a7]/30 focus:border-[#3453a7]"
                  />
                </div>
              ))}
              <Button
                onClick={handleTeamsSubmit}
                disabled={teamNames.filter((name) => name.trim()).length < 2}
                className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-xl py-6 shadow-lg"
              >
                التالي
                <ArrowRight className="mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // صفحة اختيار الفئات
  if (step === "categories") {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-[#3453a7]/20">
            <h1 className="text-4xl font-bold text-center mb-4 text-[#1a2332] bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent">
              اختر 4 فئات
            </h1>
            <p className="text-center text-[#1a2332]/70 mb-8">
              تم اختيار {selectedCategoryIds.length} من 4 فئات
            </p>
            {/* ...existing code... */}

            {loading ? (
              <div className="text-center py-12">
                <SiteLoader />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {allCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategorySelection(category.id)}
                      disabled={!selectedCategoryIds.includes(category.id) && selectedCategoryIds.length >= 4}
                      className={`p-6 rounded-lg border-2 transition-all relative ${
                        selectedCategoryIds.includes(category.id)
                          ? "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-[#24428f] shadow-lg"
                          : "bg-white text-[#1a2332] border-gray-200 hover:border-[#3453a7]"
                      } ${!selectedCategoryIds.includes(category.id) && selectedCategoryIds.length >= 4 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <h3 className="text-lg font-bold text-center">
                        {category.name}
                      </h3>
                      <p className={`text-sm text-center mt-2 ${selectedCategoryIds.includes(category.id) ? "text-white/80" : "text-[#1a2332]/60"}`}>
                        {category.questions?.length || 0} أسئلة
                      </p>
                      {selectedCategoryIds.includes(category.id) && (
                        <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep("teams")}
                    variant="outline"
                    className="flex-1 text-lg py-6 border-2 border-[#3453a7] text-[#3453a7] hover:bg-[#3453a7]/10"
                  >
                    رجوع
                  </Button>
                  <Button
                    onClick={startGame}
                    disabled={selectedCategoryIds.length !== 4}
                    className="flex-1 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-lg py-6 shadow-lg"
                  >
                    ابدأ اللعبة
                    <ArrowRight className="mr-2" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // صفحة اللعبة
  return (
      <div className="min-h-screen bg-white p-4 relative">
        {/* زر إنهاء اللعبة أعلى يمين */}
        <button
          onClick={() => {
            // إنهاء اللعبة: اعتبر كل الأسئلة مجابة وأظهر النتائج
            setShowAnswer(false);
            setSelectedQuestion(null);
            setSelectedCategoryId(null);
            // اجعل كل الأسئلة مجابة
            setGameCategories(prev => prev.map(cat => ({
              ...cat,
              questions: cat.questions.map(q => ({ ...q, answered: true }))
            })));
          }}
          className="absolute top-3 right-3 z-50 p-0.5 bg-white/80 hover:bg-red-100 border border-[#3453a7] rounded-full shadow text-[#3453a7]"
          title="إنهاء اللعبة"
          style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="max-w-7xl mx-auto">
        {/* مؤشر الدور الحالي */}
        <div className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 mb-3 sm:mb-4 text-center border-2 border-[#24428f]">
          <p className="text-lg sm:text-2xl font-bold">
            دور الفريق: {teamNames[currentTurn]}
          </p>
        </div>

        {/* لوحة النقاط */}
        <div className="bg-gradient-to-r from-white via-[#f8fbff] to-white rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-6 mb-3 sm:mb-6 border-2 border-[#3453a7]/30">
          <div
            className={`grid ${
              teamNames.length === 2
                ? 'grid-cols-2 gap-3 sm:gap-6'
                : teamNames.length === 3
                ? 'grid-cols-3 gap-2 sm:gap-4'
                : 'grid-cols-4 gap-2 sm:gap-3'
            }`}
          >
            {teamNames.map((name, idx) => (
              <div
                key={idx}
                className={`text-center transition-all duration-300 ${
                  currentTurn === idx ? "ring-2 sm:ring-4 ring-[#3453a7] rounded-xl shadow-xl scale-105" : "opacity-75"
                }`}
              >
                <div
                  className={`bg-gradient-to-br from-[#f8fbff] to-[#eef3ff] rounded-xl border-2 border-[#3453a7]/40 ${
                    teamNames.length > 2 ? 'p-1 sm:p-2' : 'p-2 sm:p-4'
                  }`}
                >
                  <h3
                    className={`font-bold bg-gradient-to-r from-[#4f73d1] to-[#3453a7] bg-clip-text text-transparent mb-1 sm:mb-2 ${
                      teamNames.length > 2 ? 'text-xs sm:text-base' : 'text-sm sm:text-xl'
                    }`}
                  >
                    {name}
                  </h3>
                  <button
                    onClick={() => setEditingTeam(idx)}
                    className={`${
                      teamNames.length > 2
                        ? 'text-2xl sm:text-3xl'
                        : 'text-3xl sm:text-5xl'
                    } font-black text-[#4f73d1] hover:text-[#3453a7] transition-all transform hover:scale-110 drop-shadow-lg`}
                  >
                    {teamScores[idx]}
                  </button>
                  <p className={`${teamNames.length > 2 ? 'text-[10px] sm:text-xs' : 'text-xs'} text-[#1a2332]/60 mt-1 font-medium`}>
                    نقطة
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* لوحة الفئات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {gameCategories.map((category) => (
            <div key={category.id} className="flex flex-col">
              {/* عنوان الفئة */}
              <div className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white p-2 sm:p-3 text-center font-bold text-sm sm:text-base rounded-t-lg shadow-md">
                {category.name}
              </div>

              {/* الأسئلة */}
              <div className="flex flex-col gap-1 sm:gap-2">
                {category.questions.map((question) => (
                  <button
                    key={question.id}
                    onClick={() => handleQuestionClick(category.id, question)}
                    disabled={question.answered}
                    className={`p-2 sm:p-4 text-base sm:text-xl font-bold transition-all rounded-lg ${
                      question.answered
                        ? "bg-white/50 text-gray-300 cursor-not-allowed border-2 border-gray-200"
                        : "bg-white text-[#1a2332] hover:bg-[#f8fbff] cursor-pointer shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-[#3453a7]"
                    }`}
                  >
                    {question.answered ? "✓" : question.points}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* مودال السؤال */}
      <Dialog
        open={selectedQuestion !== null}
        onOpenChange={() => {
          setSelectedQuestion(null)
          setShowAnswer(false)
          setTimerActive(false)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-3xl text-center text-[#1a2332] space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span>دور الفريق: {teamNames[currentTurn]}</span>
                {/* زر إعادة السؤال أيقونة فقط */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCategoryId && selectedQuestion) {
                      const cat = gameCategories.find(c => c.id === selectedCategoryId);
                      if (cat) {
                        const alternatives = cat.questions.filter(q => q.points === selectedQuestion.points && !q.answered && q.id !== selectedQuestion.id);
                        if (alternatives.length > 0) {
                          const randomIdx = Math.floor(Math.random() * alternatives.length);
                          setSelectedQuestion(alternatives[randomIdx]);
                          setShowAnswer(false);
                          setTimeLeft(60);
                          setTimerActive(true);
                        }
                      }
                    }
                  }}
                  className="ml-1 p-0 bg-transparent border-none shadow-none hover:bg-transparent focus:outline-none"
                  title="إعادة سؤال"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="#3453a7" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 19.07A10 10 0 1 1 12 22v-4m0 4 3-3m-3 3-3-3" />
                  </svg>
                </button>
              </div>
              <div className="text-lg sm:text-2xl text-[#3453a7]">{selectedQuestion?.points} نقطة</div>
              <div className="text-2xl font-bold" style={{ color: '#20335f' }}>
                ⏱️ {timeLeft}s
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
            <div className="bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-lg p-4 sm:p-6 border-2 border-[#3453a7]/30">
              <p className="text-lg sm:text-2xl text-center font-semibold text-[#1a2332]">
                {selectedQuestion?.question}
              </p>
            </div>

            {showAnswer && (
              <div className="bg-gradient-to-r from-[#eef3ff] to-[#f8fbff] rounded-lg p-4 sm:p-6 border-2 border-[#3453a7]">
                <p className="text-base sm:text-xl text-center font-bold text-[#1a2332]">
                  الإجابة: {selectedQuestion?.answer}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-xl py-6 shadow-lg"
                >
                  إظهار الإجابة
                </Button>
              ) : (
                <div className={`grid grid-cols-${teamNames.length + 1} gap-3`}>
                  {teamNames.map((name, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handleCorrectAnswer(idx)}
                      className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-lg py-6 shadow-lg"
                    >
                      {name}
                    </Button>
                  ))}
                  <Button
                    onClick={() => handleCorrectAnswer("none")}
                    variant="outline"
                    className="text-lg py-6 border-2 border-gray-400 text-gray-600 hover:bg-gray-100"
                  >
                    محد جاوب
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة النتائج النهائية */}
      {gameCategories.length > 0 && gameCategories.every(cat => cat.questions.every(q => q.answered)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-12 border-2 border-[#3453a7]/30 text-center flex flex-col items-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent" style={{lineHeight:1.2, paddingBottom:'0.2em'}}>النتائج النهائية</h1>
            <div className="space-y-4 w-full max-w-md mx-auto mt-4">
              {[...teamNames.map((name, idx) => ({name, score: teamScores[idx]}))]
                .sort((a, b) => b.score - a.score)
                .map((team, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-xl p-4 mb-2">
                    <span className="text-xl font-bold text-[#1a2332]">{idx + 1}. {team.name}</span>
                    <span className="text-2xl font-black text-[#3453a7]">{team.score.toLocaleString()}</span>
                  </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full">
              <Button
                onClick={async () => {
                  await resetUsedQuestions();
                  await fetchUsedQuestions();
                  window.location.reload();
                }}
                className="flex-1 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl py-6"
              >
                <svg className="inline w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M4.93 19.07A10 10 0 1 1 12 22v-4m0 4 3-3m-3 3-3-3"/></svg>
                لعب مرة أخرى
              </Button>
              <Button
                onClick={async () => {
                  await resetUsedQuestions();
                  await fetchUsedQuestions();
                  window.location.href = '/';
                }}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-xl py-6 flex items-center justify-center gap-2"
              >
                خروج
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* مودال تعديل النقاط */}
      <Dialog open={editingTeam !== null} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-[#1a2332]">
              تعديل نقاط {editingTeam !== null ? teamNames[editingTeam] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editScore" className="text-lg font-semibold text-[#1a2332]">
                النقاط الجديدة
              </Label>
              <div className="flex items-center gap-8 mt-2 justify-center">
                <Button
                  type="button"
                  onClick={() => setEditScore((prev) => (parseInt(prev || "0") - 100).toString())}
                  className="text-4xl px-8 py-4 bg-transparent text-red-700 hover:bg-red-100 border-none shadow-none"
                  disabled={parseInt(editScore || "0") <= 0}
                >
                  -
                </Button>
                <span className="text-3xl font-bold w-16 text-center select-none">
                  {editScore}
                </span>
                <Button
                  type="button"
                  onClick={() => setEditScore((prev) => (parseInt(prev || "0") + 100).toString())}
                  className="text-4xl px-8 py-4 bg-transparent text-green-700 hover:bg-green-100 border-none shadow-none"
                >
                  +
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveScore}
                className="flex-1 text-lg py-6 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white shadow-lg"
              >
                حفظ
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1 text-lg py-6 border-2 border-gray-300 hover:bg-gray-100"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}