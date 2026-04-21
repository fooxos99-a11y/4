"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Clock, Layout } from "lucide-react"

interface Box {
  id: number
  size: number
  clicked: boolean
  order: number
  shape: string
}

interface SizeOrderingChallengeProps {
  onSuccess: () => void
  onFailure: (message: string) => void
  timeLimit?: number
}

export function SizeOrderingChallenge({ onSuccess, onFailure, timeLimit = 60 }: SizeOrderingChallengeProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [timerActive, setTimerActive] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const maxRounds = 3

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const generateRandomShapes = () => {
    const shapes = ["square", "circle", "triangle", "diamond", "star", "hexagon"]
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)]
    return Array(6).fill(randomShape)
  }

  const [boxes, setBoxes] = useState<Box[]>(() => {
    const shapes = generateRandomShapes()
    return [
      { id: 1, size: 200, clicked: false, order: 1, shape: shapes[0] },
      { id: 2, size: 180, clicked: false, order: 2, shape: shapes[1] },
      { id: 3, size: 160, clicked: false, order: 3, shape: shapes[2] },
      { id: 4, size: 140, clicked: false, order: 4, shape: shapes[3] },
      { id: 5, size: 120, clicked: false, order: 5, shape: shapes[4] },
      { id: 6, size: 100, clicked: false, order: 6, shape: shapes[5] },
    ].sort(() => Math.random() - 0.5)
  })

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) onFailure("انتهى الوقت!")
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive, timeLeft, onFailure])

  const startNewRound = () => {
    const newShapes = generateRandomShapes()
    const newBoxes = [200, 180, 160, 140, 120, 100].map((s, i) => ({
      id: i + (currentRound * 10),
      size: s, 
      clicked: false, 
      order: i, 
      shape: newShapes[i]
    })).sort(() => Math.random() - 0.5)
    setBoxes(newBoxes)
    setCurrentStep(0)
    setGameOver(false)
  }

  const handleBoxClick = (boxId: number) => {
    if (gameOver || !timerActive) return
    const clickedBox = boxes.find((b) => b.id === boxId)
    if (!clickedBox || clickedBox.clicked) return

    const correctBox = boxes.filter((b) => !b.clicked).sort((a, b) => b.size - a.size)[0]

    if (clickedBox.id !== correctBox.id) {
      setTimerActive(false)
      setGameOver(true)
      onFailure("ترتيب خاطئ!")
      return
    }

    const newBoxes = boxes.map((b) => (b.id === boxId ? { ...b, clicked: true } : b))
    setBoxes(newBoxes)
    setCurrentStep(currentStep + 1)

    if (currentStep + 1 === boxes.length) {
      if (currentRound === maxRounds) {
        setTimerActive(false)
        onSuccess()
      } else {
        setCurrentRound(currentRound + 1)
        setTimeout(startNewRound, 1000)
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-2 min-h-[550px] relative font-sans" dir="rtl">
      
      {/* الشريط العلوي - مرتفع للأعلى بتصميم فاتح ونصوص غامقة */}
      <div className="w-full flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-lg mt-2">
        
        {/* قسم الجولات */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
             <Layout className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-slate-900 text-sm font-bold tracking-tight">الجولة</span>
            <div className="flex gap-1.5">
              {Array.from({ length: maxRounds }).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-700 ${
                    i < currentRound - 1 ? 'w-6 bg-emerald-500' : 
                    i === currentRound - 1 ? 'w-10 bg-indigo-600 shadow-md' : 
                    'w-6 bg-slate-200'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* قسم المؤقت */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all ${
          timeLeft <= 10 ? "bg-red-50 border border-red-200" : "bg-slate-50 border border-slate-100"
        }`}>
          <div className="flex flex-col items-end">
              <span className={`text-[16px] font-extrabold tracking-tight ${timeLeft <= 10 ? "text-red-600" : "text-slate-900"}`}>المؤقت</span>
              <span className={`text-3xl font-extrabold font-mono tracking-widest leading-none ${timeLeft <= 10 ? "text-red-600 animate-pulse" : "text-indigo-900"}`}>
                {timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </span>
          </div>
          <Clock className={`w-5 h-5 ${timeLeft <= 10 ? "text-red-600" : "text-indigo-600"}`} />
        </div>
      </div>

      {/* منطقة الأشكال */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center items-center flex-1 w-full pt-4">
        {boxes.map((box) => {
          const displaySize = isMobile ? box.size * 0.55 : box.size * 0.75;
          
          const colors: any = {
            square: "from-indigo-500 to-purple-600",
            circle: "from-rose-400 to-red-600",
            triangle: "from-amber-400 to-orange-600",
            diamond: "from-emerald-400 to-teal-600",
            star: "from-cyan-400 to-blue-600",
            hexagon: "from-fuchsia-500 to-pink-600"
          };

          const clipPaths: any = {
            square: "none",
            circle: "none",
            triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
            diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"
          };

          return (
            <button
              key={box.id}
              onClick={() => handleBoxClick(box.id)}
              disabled={box.clicked || gameOver}
              className={`group relative transition-all duration-300 transform shadow-xl active:scale-90 flex items-center justify-center
                ${box.clicked ? "opacity-10 scale-75 cursor-not-allowed grayscale" : "hover:scale-105 cursor-pointer"}
                bg-gradient-to-br ${colors[box.shape] || "from-gray-400 to-gray-600"}`}
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                clipPath: clipPaths[box.shape],
                borderRadius: box.shape === 'circle' ? '50%' : '16px'
              }}
            >
              {box.clicked ? (
                <CheckCircle className="text-white w-1/2 h-1/2" />
              ) : (
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )
        })}
      </div>

      {/* رسالة الجولة التالية */}
      {currentStep === 6 && currentRound <= maxRounds && !gameOver && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-10 py-5 rounded-3xl font-bold text-xl shadow-2xl z-50 animate-in zoom-in">
          أحسنت! الجولة التالية...
        </div>
      )}
    </div>
  )
}
