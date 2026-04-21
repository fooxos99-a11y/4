"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { Plus, Minus, HelpCircle, Trophy, RotateCcw } from "lucide-react"

type Team = {
  name: string
  score: number
}

type Question = {
  id: string
  category: {
    id: string
    name: string
  }
  question: string
  answer: string
}

export default function AuctionGame() {
  const [step, setStep] = useState<"setup" | "game" | "winner">("setup")
  const [numTeams, setNumTeams] = useState(2)
  const [teamNames, setTeamNames] = useState<string[]>(["", ""])
  const [teams, setTeams] = useState<Team[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showBiddingDialog, setShowBiddingDialog] = useState(false)
  const [bidAmount, setBidAmount] = useState(100)
  const [currentBidder, setCurrentBidder] = useState<number | null>(null)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [timerActive, setTimerActive] = useState(false)

  const [cycleNotification, setCycleNotification] = useState(false)

  // تعديل النقاط يدويًا
  const [editingTeam, setEditingTeam] = useState<number | null>(null)
  const [editScore, setEditScore] = useState("")
  // منطق حفظ النقاط المعدلة يدويًا
  const handleSaveScore = () => {
    const newScore = parseInt(editScore) || 0
    if (editingTeam !== null && editingTeam >= 0 && editingTeam < teams.length) {
      const newTeams = [...teams]
      newTeams[editingTeam] = { ...newTeams[editingTeam], score: newScore }
      setTeams(newTeams)
    }
    setEditingTeam(null)
    setEditScore("")
  }

  const handleCancelEdit = () => {
    setEditingTeam(null)
    setEditScore("")
  }

  useEffect(() => {
    fetchQuestions()
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

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/auction-questions")
      const data = await response.json()
      setAllQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsedQuestions = async () => {
    try {
      const response = await fetch("/api/used-questions?gameType=auction")
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
        body: JSON.stringify({ gameType: "auction", questionId })
      })
    } catch (error) {
      console.error("Error marking question as used:", error)
    }
  }


  // تم تعطيل إعادة تعيين الأسئلة المستخدمة نهائيًا حتى لا تتكرر الأسئلة لنفس الحساب

  const handleNumTeamsChange = (value: number) => {
    const newNum = Math.max(2, Math.min(10, value))
    setNumTeams(newNum)
    setTeamNames(Array(newNum).fill(""))
  }

  const handleTeamNameChange = (index: number, value: string) => {
    const newNames = [...teamNames]
    newNames[index] = value
    setTeamNames(newNames)
  }

  const startGame = () => {
    if (teamNames.every(name => name.trim())) {
      const initialTeams = teamNames.map(name => ({
        name: name.trim(),
        score: 1000
      }))
      setTeams(initialTeams)
      setStep("game")
    }
  }

  const adjustScore = (teamIndex: number, amount: number) => {
    setTeams(teams.map((team, index) => {
      if (index === teamIndex) {
        const newScore = Math.max(0, team.score + amount)
        // التحقق من الفوز التلقائي
        if (newScore >= 10000) {
          setStep("winner")
          return { ...team, score: newScore }
        }
        return { ...team, score: newScore }
      }
      return team
    }))
  }

  const resetUsedQuestions = async () => {
    try {
      await fetch("/api/used-questions?gameType=auction", { method: "DELETE" })
      setUsedQuestionIds([])
    } catch (error) {
      console.error("Error resetting used questions:", error)
    }
  }

  const selectQuestion = async () => {
    const usedIds = Array.isArray(usedQuestionIds) ? usedQuestionIds : []
    let availableQuestions = allQuestions.filter(q => !usedIds.includes(q.id))

    // إذا انتهت الأسئلة، أعد تعيينها من جديد
    if (availableQuestions.length === 0) {
      await resetUsedQuestions()
      availableQuestions = [...allQuestions]
      setCycleNotification(true)
      setTimeout(() => setCycleNotification(false), 3000)
    }

    if (availableQuestions.length === 0) return

    // اختيار سؤال عشوائي من المتاحة
    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
    setCurrentQuestion(randomQuestion)
    const newUsedIds = [...(allQuestions.length === availableQuestions.length ? [] : usedIds), randomQuestion.id]
    setUsedQuestionIds(newUsedIds)
    await markQuestionAsUsed(randomQuestion.id)
    setShowCategoryDialog(true)
  }

  const startBidding = (teamIndex: number) => {
    setCurrentBidder(teamIndex)
    setBidAmount(100)
    setShowCategoryDialog(false)
    setShowBiddingDialog(true)
  }

  const adjustBid = (amount: number) => {
    setBidAmount(prev => Math.max(100, prev + amount))
  }

  const confirmBid = () => {
    setShowAnswer(false)
    setShowBiddingDialog(false)
    setShowQuestionDialog(true)
    setTimeLeft(60)
    setTimerActive(true)
  }

  const handleCorrectAnswer = () => {
    if (currentBidder !== null) {
      setTeams(teams.map((team, index) => {
        if (index === currentBidder) {
          const newScore = team.score + bidAmount
          if (newScore >= 10000) {
            setStep("winner")
          }
          return { ...team, score: newScore }
        }
        return team
      }))
    }
    setShowQuestionDialog(false)
    setCurrentQuestion(null)
    setCurrentBidder(null)
    setTimerActive(false)
  }

  const handleWrongAnswer = () => {
    if (currentBidder !== null) {
      setTeams(teams.map((team, index) => {
        if (index === currentBidder) {
          return { ...team, score: Math.max(0, team.score - bidAmount) }
        }
        return team
      }))
    }
    setShowQuestionDialog(false)
    setCurrentQuestion(null)
    setCurrentBidder(null)
    setTimerActive(false)
  }

  const endGame = () => {
    setStep("winner")
  }

  const resetGame = () => {
    setStep("setup")
    setNumTeams(2)
    setTeamNames(["", ""])
    setTeams([])
    setCurrentQuestion(null)
    setShowAnswer(false)
  }

  const winnerTeam = teams.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current
  , teams[0])

  // صفحة الإعداد
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 border-2 border-[#3453a7]/30">
            <h1 className="text-2xl sm:text-4xl font-bold text-center mb-4 sm:mb-8 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent">
              لعبة المزاد
            </h1>

            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold text-[#1a2332] mb-2">
                  عدد الفرق
                </Label>
                <Input
                  type="number"
                  min="2"
                  max="10"
                  value={numTeams}
                  onChange={(e) => handleNumTeamsChange(parseInt(e.target.value) || 2)}
                  className="text-center text-xl font-bold"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-semibold text-[#1a2332]">
                  أسماء الفرق
                </Label>
                {teamNames.map((name, index) => (
                  <Input
                    key={index}
                    placeholder={`الفريق ${index + 1}`}
                    value={name}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                    className="text-lg"
                  />
                ))}
              </div>

              <Button
                onClick={startGame}
                disabled={!teamNames.every(name => name.trim()) || loading}
                className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl py-6"
              >
                {loading ? <SiteLoader size="sm" color="#ffffff" /> : "ابدأ اللعبة"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // صفحة الفائز
  if (step === "winner") {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-12 border-2 border-[#3453a7]/30 text-center">
            <Trophy className="w-32 h-32 mx-auto mb-6 text-[#3453a7]" />
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent">
              مبروك!
            </h1>
            <p className="text-3xl font-bold text-[#1a2332] mb-4">
              الفريق الفائز: {winnerTeam?.name}
            </p>
            <p className="text-6xl font-black text-[#3453a7] mb-8">
              {winnerTeam?.score.toLocaleString()} نقطة
            </p>

            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#1a2332] mb-4">النتائج النهائية:</h3>
              {teams
                .sort((a, b) => b.score - a.score)
                .map((team, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-xl p-4"
                  >
                    <span className="text-xl font-bold text-[#1a2332]">
                      {index + 1}. {team.name}
                    </span>
                    <span className="text-2xl font-black text-[#3453a7]">
                      {team.score.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>

            <Button
              onClick={resetGame}
              className="mt-8 w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl py-6"
            >
              <RotateCcw className="mr-2" />
              لعب مرة أخرى
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // صفحة اللعبة
  return (
    <div className="min-h-screen bg-white p-4 sm:p-8">

      {/* إشعار إعادة الأسئلة */}
      {cycleNotification && (
        <div className="fixed top-4 inset-x-0 mx-auto max-w-sm z-50 px-4">
          <div className="bg-[#1a2332] text-white text-sm font-semibold text-center rounded-xl px-5 py-3 shadow-xl">
            🔄 تم إعادة جميع الأسئلة من جديد
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-5xl font-black mb-2 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent">
            🏆 لعبة المزاد
          </h1>
          <p className="text-[#1a2332]/60 text-base sm:text-lg font-medium">
            زايد على السؤال واحصل على النقاط!
          </p>
        </div>

        {/* عرض الفرق مع إمكانية تعديل النقاط */}
        <div className={`grid gap-4 sm:gap-6 mb-6 sm:mb-10 ${
          teams.length === 2 ? 'grid-cols-2' : 
          teams.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 
          'grid-cols-2 lg:grid-cols-4'
        }`}>
          {teams.map((team, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-[#3453a7]/20 hover:border-[#3453a7] transition-all">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[#1a2332]">
                    {team.name}
                  </h3>
                  <div className="relative flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTeam(index)
                        setEditScore(team.score.toString())
                      }}
                      className="focus:outline-none"
                      title="تعديل النقاط"
                    >
                      <span className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-[#3453a7] to-[#4f73d1] bg-clip-text text-transparent mb-1">
                        {team.score.toLocaleString()}
                      </span>
                    </button>
                    {/* كلمة نقطة أُزيلت بناءً على طلب المستخدم */}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      {/* مودال تعديل النقاط */}
      <Dialog open={editingTeam !== null} onOpenChange={handleCancelEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-[#1a2332]">
              تعديل نقاط {editingTeam !== null ? teams[editingTeam]?.name : ""}
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

        {/* أزرار التحكم */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-[#3453a7]/20">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={selectQuestion}
              size="lg"
              disabled={loading || allQuestions.length === 0}
              className="flex-1 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-lg sm:text-xl px-8 py-6 sm:py-8 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <HelpCircle className="mr-2 w-6 h-6" />
              سؤال جديد
            </Button>
            <Button
              onClick={endGame}
              size="lg"
              className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg sm:text-xl px-8 py-6 sm:py-8 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <Trophy className="mr-2 w-6 h-6" />
              إنهاء اللعبة
            </Button>
          </div>
        </div>
      </div>

      {/* مودال عرض الفئة واختيار الفريق مع زر إعادة */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] mb-4 flex items-center justify-center gap-2">
              <span>الفئة</span>
              {/* زر تغيير الفئة */}
              {currentQuestion && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="تغيير الفئة"
                  onClick={async () => {
                    // جلب الفئات الأخرى التي بها أسئلة غير مستخدمة
                    const otherCategories = Array.from(new Set(
                      allQuestions
                        .filter(q => q.category.id !== currentQuestion.category.id && !usedQuestionIds.includes(q.id))
                        .map(q => q.category.id)
                    ));
                    if (otherCategories.length === 0) {
                      alert("لا يوجد فئة أخرى بها أسئلة متاحة!");
                      return;
                    }
                    // اختيار فئة عشوائية
                    const randomCatId = otherCategories[Math.floor(Math.random() * otherCategories.length)];
                    const available = allQuestions.filter(
                      q => q.category.id === randomCatId && !usedQuestionIds.includes(q.id)
                    );
                    if (available.length === 0) {
                      alert("لا يوجد سؤال متاح في الفئة الجديدة!");
                      return;
                    }
                    const random = available[Math.floor(Math.random() * available.length)];
                    setCurrentQuestion(random);
                  }}
                  className="ml-2"
                >
                  <RotateCcw className="w-6 h-6 text-[#4f73d1]" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
            <div className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] rounded-lg p-6 sm:p-12 mb-4 sm:mb-6">
              <p className="text-2xl sm:text-4xl text-center font-black text-white">
                {currentQuestion?.category.name}
              </p>
            </div>

            <p className="text-base sm:text-xl text-center text-[#1a2332] font-semibold mb-4 sm:mb-6">
              اختر الفريق الذي سيزايد:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {teams.map((team, index) => (
                <Button
                  key={index}
                  onClick={() => startBidding(index)}
                  className="bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] hover:from-[#3453a7] hover:to-[#4f73d1] text-[#1a2332] hover:text-white border-2 border-[#3453a7] font-bold text-lg py-8"
                >
                  {team.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال المزايدة */}
      <Dialog open={showBiddingDialog} onOpenChange={setShowBiddingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] mb-4">
              مبلغ المزاد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {currentBidder !== null && (
              <div className="text-center mb-4">
                <p className="text-xl font-bold text-[#1a2332]">
                  الفريق: {teams[currentBidder]?.name}
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-lg p-6 sm:p-12 border-2 border-[#3453a7]/30">
              <p className="text-3xl sm:text-6xl font-black text-center text-[#3453a7]">
                {bidAmount.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3 sm:gap-4 justify-center items-center">
              <Button
                onClick={() => adjustBid(-100)}
                size="lg"
                className="bg-gradient-to-br from-[#4f73d1] to-[#24428f] hover:from-[#24428f] hover:to-[#a87327] text-white text-xl sm:text-2xl h-16 w-16 sm:h-20 sm:w-20 shadow-lg"
              >
                <Minus className="w-6 h-6 sm:w-8 sm:h-8" />
              </Button>
              <span className="text-lg sm:text-2xl font-bold text-[#1a2332]">100</span>
              <Button
                onClick={() => adjustBid(100)}
                size="lg"
                className="bg-gradient-to-br from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-2xl h-20 w-20 shadow-lg"
              >
                <Plus className="w-8 h-8" />
              </Button>
            </div>

            <Button
              onClick={confirmBid}
              className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl py-6"
            >
              تأكيد المزاد
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال السؤال مع زر إعادة */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center text-[#1a2332] space-y-2 flex flex-col items-center">
              <div className="flex items-center justify-center gap-2">
                <span>السؤال - مبلغ المزاد: {bidAmount.toLocaleString()}</span>
                {/* زر إعادة السؤال فقط */}
                {currentQuestion && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="تغيير السؤال بنفس الفئة"
                    onClick={async () => {
                      if (!currentQuestion?.category?.id) return;
                      const available = allQuestions.filter(
                        q => q.category.id === currentQuestion.category.id && !usedQuestionIds.includes(q.id) && q.id !== currentQuestion.id
                      )
                      if (available.length === 0) {
                        alert("لا يوجد سؤال آخر متاح في هذه الفئة!")
                        return;
                      }
                      const random = available[Math.floor(Math.random() * available.length)]
                      setCurrentQuestion(random)
                    }}
                    className="ml-2"
                  >
                    <RotateCcw className="w-6 h-6 text-[#3453a7]" />
                  </Button>
                )}
              </div>
              <div className="text-2xl font-bold" style={{ color: '#20335f' }}>
                ⏱️ {timeLeft}s
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] rounded-lg p-4 mb-4">
              <p className="text-xl text-center font-bold text-white">
                {currentQuestion?.category.name}
              </p>
            </div>
            <div className="bg-gradient-to-r from-[#f8fbff] to-[#eef3ff] rounded-lg p-8 border-2 border-[#3453a7]/30">
              <p className="text-2xl text-center font-semibold text-[#1a2332]">
                {currentQuestion?.question}
              </p>
            </div>

            {showAnswer && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-8 border-2 border-green-500">
                <p className="text-2xl text-center font-bold text-green-900">
                  الإجابة: {currentQuestion?.answer}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  size="lg"
                  className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white text-xl px-12 py-6"
                >
                  إظهار الإجابة
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCorrectAnswer}
                    size="lg"
                    className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#24428f] text-white text-xl px-12 py-6 shadow-lg"
                  >
                    <Plus className="mr-2" />
                    إجابة صحيحة (+{bidAmount.toLocaleString()})
                  </Button>
                  <Button
                    onClick={handleWrongAnswer}
                    size="lg"
                    className="bg-gradient-to-r from-[#4f73d1] to-[#24428f] hover:from-[#24428f] hover:to-[#a87327] text-white text-xl px-12 py-6 shadow-lg"
                  >
                    <Minus className="mr-2" />
                    إجابة خاطئة (-{bidAmount.toLocaleString()})
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
