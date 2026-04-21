"use client"

import { useState, useEffect } from "react"
import { Clock, Calculator, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteLoader } from "@/components/ui/site-loader"

interface MathProblemsChallengeProps {
  onSuccess: () => void
  onFailure: (message: string) => void
  timeLimit?: number
}

interface Problem {
  question: string
  answer: number
  options: number[]
}

export function MathProblemsChallenge({ onSuccess, onFailure, timeLimit = 60 }: MathProblemsChallengeProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [timerActive, setTimerActive] = useState(true)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [problems, setProblems] = useState<Problem[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)

  const roundsCount = 3;
  useEffect(() => {
    generateProblems()
  }, [])

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) {
        setTimerActive(false)
        onFailure("انتهى الوقت قبل حل جميع المسائل")
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false)
          onFailure("انتهى الوقت قبل حل جميع المسائل")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timerActive, timeLeft])

  const generateProblems = () => {
    const newProblems: Problem[] = []
    const operations = ["+", "-", "×", "÷"]

    for (let i = 0; i < roundsCount; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)]
      let num1, num2, answer, question

      switch (operation) {
        case "+":
          num1 = Math.floor(Math.random() * 50) + 1
          num2 = Math.floor(Math.random() * 50) + 1
          answer = num1 + num2
          question = `${num1} + ${num2} = ؟`
          break
        case "-":
          num1 = Math.floor(Math.random() * 50) + 20
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1
          answer = num1 - num2
          question = `${num1} - ${num2} = ؟`
          break
        case "×":
          num1 = Math.floor(Math.random() * 12) + 1
          num2 = Math.floor(Math.random() * 12) + 1
          answer = num1 * num2
          question = `${num1} × ${num2} = ؟`
          break
        case "÷":
          num2 = Math.floor(Math.random() * 10) + 2
          answer = Math.floor(Math.random() * 10) + 1
          num1 = num2 * answer
          question = `${num1} ÷ ${num2} = ؟`
          break
        default:
          answer = 0
          question = ""
      }

      // Generate 3 wrong options
      const wrongOptions = []
      while (wrongOptions.length < 3) {
        const wrongAnswer = answer + Math.floor(Math.random() * 20) - 10
        if (wrongAnswer !== answer && !wrongOptions.includes(wrongAnswer) && wrongAnswer > 0) {
          wrongOptions.push(wrongAnswer)
        }
      }

      const options = [answer, ...wrongOptions].sort(() => Math.random() - 0.5)

      newProblems.push({ question, answer, options })
    }

    setProblems(newProblems)
  }

  const handleAnswerSelect = (answer: number) => {
    if (!timerActive) return

    setSelectedAnswer(answer)

    // Check if answer is correct
    if (answer === problems[currentProblemIndex].answer) {
      // Correct answer
      setTimeout(() => {
        if (currentProblemIndex < problems.length - 1) {
          // Move to next problem
          setCurrentProblemIndex(currentProblemIndex + 1)
          setSelectedAnswer(null)
        } else {
          // All problems solved!
          setTimerActive(false)
          onSuccess()
        }
      }, 500)
    } else {
      // Wrong answer - fail immediately
      setTimerActive(false)
      onFailure("إجابة خاطئة! حاول مرة أخرى")
    }
  }

  if (problems.length === 0) {
    return <div className="flex items-center justify-center h-full"><SiteLoader size="sm" /></div>
  }

  const currentProblem = problems[currentProblemIndex]

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-8 bg-white">
      {/* Timer at top right */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className="flex items-center gap-2 bg-gradient-to-r from-[#3453a7] to-[#4f73d1] backdrop-blur rounded-2xl shadow-xl"
          style={{ padding: '8px 16px', minWidth: 0 }}
        >
          <Clock className="text-white" style={{ width: '22px', height: '22px' }} />
          <span
            className={`font-bold ${timeLeft <= 10 ? "text-red-100 animate-pulse" : "text-white"}`}
            style={{ fontSize: '1.5rem', minWidth: 0 }}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Only round indicators at the top, larger and centered */}
      <div className="w-full text-center mt-4 mb-8 flex flex-col items-center" style={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2}}>
        <div className="flex items-center justify-center gap-3 order-1">
          {Array.from({ length: roundsCount }).map((_, index) => (
            <div
              key={index}
              className={`w-7 h-7 rounded-full transition-all border-2 border-[#3453a7] ${
                index < currentProblemIndex
                  ? "bg-green-500"
                  : index === currentProblemIndex
                    ? "bg-[#3453a7] scale-125"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question and options, no card/container */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center mt-24 sm:mt-32">
        <div className="text-center mb-12 w-full">
          <div
            className="text-5xl sm:text-6xl font-bold text-[#1a2332] mb-4 font-mono overflow-hidden text-ellipsis"
            style={{ whiteSpace: 'nowrap', maxWidth: '100%' }}
          >
            {currentProblem.question}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
          {currentProblem.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              disabled={selectedAnswer !== null || !timerActive}
              className={`h-24 text-3xl font-bold transition-all ${
                selectedAnswer === option
                  ? option === currentProblem.answer
                    ? "bg-green-500 hover:bg-green-600 text-white scale-105"
                    : "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white hover:scale-105"
              }`}
            >
              {selectedAnswer === option && option === currentProblem.answer && (
                <CheckCircle2 className="w-8 h-8 ml-2" />
              )}
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
