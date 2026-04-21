"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface ColorDifferenceChallengeProps {
  onSuccess: () => void
  onFailure: (message: string) => void
  timeLimit?: number
}

export function ColorDifferenceChallenge({ onSuccess, onFailure, timeLimit = 60 }: ColorDifferenceChallengeProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [timerActive, setTimerActive] = useState(true)
  const [gridSize] = useState(3) // 3x3 grid = 9 shapes
  const [differentIndex, setDifferentIndex] = useState(0)
  const [baseColor, setBaseColor] = useState("")
  const [differentColor, setDifferentColor] = useState("")
  const [shapes, setShapes] = useState<string[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds] = useState(3)

  useEffect(() => {
    generateChallenge()
  }, [])

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) {
        setTimerActive(false)
        onFailure("انتهى الوقت قبل إكمال الجولات الثلاث")
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false)
          onFailure("انتهى الوقت قبل إكمال الجولات الثلاث")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timerActive, timeLeft])

  const generateChallenge = () => {
    // Generate random base color
    const hue = Math.floor(Math.random() * 360)
    const saturation = 60 + Math.floor(Math.random() * 20) // 60-80%
    const lightness = 50 + Math.floor(Math.random() * 10) // 50-60%

    const base = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    // Different color with slight variation (5-10% lighter or darker)
    const lightnessVariation = Math.random() > 0.5 ? 8 : -8
    const different = `hsl(${hue}, ${saturation}%, ${lightness + lightnessVariation}%)`

    setBaseColor(base)
    setDifferentColor(different)

    // Random position for different shape
    const randomIndex = Math.floor(Math.random() * (gridSize * gridSize))
    setDifferentIndex(randomIndex)

    // Generate random shape types
    const shapeTypes = ["square", "circle", "triangle", "diamond", "star", "hexagon"]
    const selectedShape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
    setShapes(Array(gridSize * gridSize).fill(selectedShape))
  }

  const handleShapeClick = (index: number) => {
    if (!timerActive) return

    if (index === differentIndex) {
      if (currentRound < totalRounds) {
        // Move to next round
        setCurrentRound(currentRound + 1)
        generateChallenge()
      } else {
        // All rounds completed!
        setTimerActive(false)
        onSuccess()
      }
    } else {
      setTimerActive(false)
      onFailure("ضغطت على الشكل الخطأ!")
    }
  }

  // دالة مساعدة لاستخراج قيم اللون وإنشاء تدرجات ثلاثية الأبعاد
  const get3DStyles = (colorStr: string) => {
    // استخراج الأرقام من نص hsl
    const match = colorStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return { background: colorStr, shadow: 'none' };

    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = parseInt(match[3]);

    // حساب درجات الألوان للإضاءة والظل
    const lightColor = `hsl(${h}, ${s}%, ${Math.min(l + 15, 100)}%)`; // إضاءة من الأعلى
    const mainColor = `hsl(${h}, ${s}%, ${l}%)`;
    const darkColor = `hsl(${h}, ${s}%, ${Math.max(l - 15, 0)}%)`; // ظل في الأسفل
    const deepShadow = `hsl(${h}, ${s}%, ${Math.max(l - 30, 0)}%)`; // لون السُمك (الجانب)

    return {
      // تدرج لوني يعطي إيحاء بالانتفاخ
      background: `linear-gradient(135deg, ${lightColor} 0%, ${mainColor} 50%, ${darkColor} 100%)`,
      // لون الظل الجانبي الصلب
      shadowColor: deepShadow
    };
  }

  const renderShape = (index: number) => {
    const isCorrect = index === differentIndex
    const color = isCorrect ? differentColor : baseColor
    const shape = shapes[index]

    const clipPaths: Record<string, string> = {
      square: "none",
      circle: "none",
      triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
      diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
      star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    }

    const shapeClass = shape === "circle" ? "rounded-full" : shape === "square" ? "rounded-xl" : "rounded-none"
    
    // الحصول على ألوان الـ 3D
    const { background, shadowColor } = get3DStyles(color);

    return (
      <div 
        key={index} 
        className="relative group w-full h-full flex items-center justify-center"
      >
        <button
          onClick={() => handleShapeClick(index)}
          disabled={!timerActive}
          className={`w-full aspect-square transition-all duration-150 ${shapeClass} ${
            timerActive ? "cursor-pointer active:translate-y-[6px]" : "cursor-not-allowed opacity-80"
          }`}
          style={{
            background: background,
            clipPath: clipPaths[shape],
            // هنا السحر: نستخدم drop-shadow لإنشاء ظل يتبع شكل القص
            // الظل الأول: لون داكن صلب لعمل سمك للشكل
            // الظل الثاني: ظل ناعم أسود للواقعية
            filter: timerActive 
              ? `drop-shadow(0px 6px 0px ${shadowColor}) drop-shadow(0px 10px 10px rgba(0,0,0,0.3))` 
              : `drop-shadow(0px 2px 0px ${shadowColor}) drop-shadow(0px 4px 4px rgba(0,0,0,0.2))`,
            // إزالة الظل الصلب عند الضغط لمحاكاة الحركة
            transform: "translateZ(0)", // تحسين الأداء
          }}
        >
          {/* لمعة إضافية خفيفة في الأعلى */}
          <div 
             className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
             style={{ 
               background: 'radial-gradient(circle at 30% 30%, white 0%, transparent 60%)' 
             }}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-8">
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-white/50">
          <Clock className="w-5 h-5 text-[#3453a7]" />
          <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#1a2332]"}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <div className="w-full text-center mt-2 mb-4 flex flex-col items-center" style={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2}}>
        <h2
          className="font-bold text-[#1a2332] whitespace-nowrap overflow-hidden text-ellipsis mx-auto order-1 drop-shadow-sm"
          style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', maxWidth: '95vw' }}
        >
          ابحث عن اللون المختلف
        </h2>
        <div className="mt-2 flex items-center justify-center gap-2 order-2">
          {Array.from({ length: totalRounds }).map((_, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all shadow-inner ${
                index < currentRound - 1
                  ? "bg-green-500 shadow-green-700"
                  : index === currentRound - 1
                    ? "bg-[#3453a7] scale-125 shadow-[#a67c3e]"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className="grid w-fit mx-auto justify-center items-center"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: window.innerWidth < 640 ? '18px' : '40px',
          padding: window.innerWidth < 640 ? '0 2vw' : '2rem',
          marginTop: window.innerWidth < 640 ? '90px' : '0',
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, index) => (
          <div key={index} style={{ width: window.innerWidth < 640 ? '22vw' : '110px', height: window.innerWidth < 640 ? '22vw' : '110px', maxWidth: 140, maxHeight: 140, minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderShape(index)}
          </div>
        ))}
      </div>
    </div>
  )
}