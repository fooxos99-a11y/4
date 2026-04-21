"use client"

import { useState, useEffect } from "react"
import { Timer, X, Sparkles } from "lucide-react"

// --- Interfaces ---
interface Item {
  id: number
  color: string
  shape: string
  originalIndex: number
}

interface InstantMemoryChallengeProps {
  onSuccess: () => void
  onFailure: (message: string) => void
  timeLimit?: number
}

export function InstantMemoryChallenge({ onSuccess, onFailure, timeLimit = 60 }: InstantMemoryChallengeProps) {
  // --- States ---
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [timerActive, setTimerActive] = useState(true)
  const [currentRound, setCurrentRound] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [memorizeTime, setMemorizeTime] = useState(10)
  const [phase, setPhase] = useState<"memorize" | "recall">("memorize")
  
  const [items, setItems] = useState<Item[]>([])
  const [availableItems, setAvailableItems] = useState<Item[]>([])
  const [placedItems, setPlacedItems] = useState<(Item | null)[]>([])
  
  // -- Dragging State --
  const [draggedItem, setDraggedItem] = useState<Item | null>(null)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [activeDropZone, setActiveDropZone] = useState<number | null>(null)

  // --- Styles ---
  const shapeGradients: Record<string, string> = {
    "#FF6B9D": "linear-gradient(135deg, #FF6B9D 0%, #FF4785 100%)",
    "#4ECDC4": "linear-gradient(135deg, #4ECDC4 0%, #2BCBBA 100%)",
    "#FFE66D": "linear-gradient(135deg, #FFE66D 0%, #FFD93D 100%)",
    "#A8E6CF": "linear-gradient(135deg, #A8E6CF 0%, #81ECC5 100%)",
    "#FF8B94": "linear-gradient(135deg, #FF8B94 0%, #FF6B74 100%)",
    "#C7CEEA": "linear-gradient(135deg, #C7CEEA 0%, #A2ACDE 100%)",
  }
  const shapes = ["circle", "square", "triangle", "diamond", "star", "hexagon"]
  const colors = Object.keys(shapeGradients)

  // --- Effects ---
  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    return () => document.body.classList.remove('overflow-hidden')
  }, [])

  useEffect(() => {
    generateNewRound()
  }, [])

  // Timer Logic
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) {
        setTimerActive(false)
        onFailure("انتهى الوقت!")
      }
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive, timeLeft])

  // Phase Logic
  useEffect(() => {
    if (phase === "memorize" && memorizeTime > 0) {
      const timer = setTimeout(() => setMemorizeTime((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (phase === "memorize" && memorizeTime === 0) {
      setPhase("recall")
    }
  }, [memorizeTime, phase])

  // Global Pointer Events for Dragging
  useEffect(() => {
    if (draggedItem) {
      const handlePointerMove = (e: PointerEvent) => {
        setDragPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        })
        
        const elements = document.elementsFromPoint(e.clientX, e.clientY)
        const dropZone = elements.find(el => el.hasAttribute('data-drop-slot')) as HTMLElement | undefined
        
        if (dropZone) {
          const slotId = parseInt(dropZone.getAttribute('data-drop-slot') || "-1", 10)
          setActiveDropZone(slotId)
        } else {
          setActiveDropZone(null)
        }
      }

      const handlePointerUp = (e: PointerEvent) => {
        const elements = document.elementsFromPoint(e.clientX, e.clientY)
        const dropZone = elements.find(el => el.hasAttribute('data-drop-slot')) as HTMLElement | undefined

        if (dropZone) {
          const slotId = parseInt(dropZone.getAttribute('data-drop-slot') || "-1", 10)
          handleDrop(slotId)
        }
        
        setDraggedItem(null)
        setDragPosition(null)
        setActiveDropZone(null)
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('contextmenu', (e) => e.preventDefault()) 

      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('contextmenu', (e) => e.preventDefault())
      }
    }
  }, [draggedItem, dragOffset, placedItems, items])

  // --- Logic ---
  const generateNewRound = () => {
    const itemCount = 3 + currentRound
    const newItems: Item[] = []
    const shuffledColors = [...colors].sort(() => Math.random() - 0.5)

    for (let i = 0; i < itemCount; i++) {
      newItems.push({
        id: i,
        color: shuffledColors[i % shuffledColors.length],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        originalIndex: i,
      })
    }
    setItems(newItems)
    setAvailableItems([...newItems].sort(() => Math.random() - 0.5))
    setPlacedItems(new Array(newItems.length).fill(null))
    setPhase("memorize")
    setMemorizeTime(10)
    setDraggedItem(null)
  }

  const handlePointerDown = (item: Item, e: React.PointerEvent) => {
    e.preventDefault() 
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setDragPosition({ x: rect.left, y: rect.top })
    setDraggedItem(item)
  }

  const handleDrop = (slotIndex: number) => {
    if (!draggedItem || gameOver || phase === "memorize") return
    if (placedItems[slotIndex] !== null) return

    const newPlacedItems = [...placedItems]
    newPlacedItems[slotIndex] = draggedItem
    setPlacedItems(newPlacedItems)
    setAvailableItems(availableItems.filter((item) => item.id !== draggedItem.id))
    
    if (newPlacedItems.filter((item) => item !== null).length === items.length) {
      checkAnswer(newPlacedItems)
    }
  }

  const handleRemoveFromSlot = (slotIndex: number) => {
    if (phase === "memorize" || gameOver) return
    const removedItem = placedItems[slotIndex]
    if (!removedItem) return
    
    const newPlacedItems = [...placedItems]
    newPlacedItems[slotIndex] = null
    setPlacedItems(newPlacedItems)
    setAvailableItems([...availableItems, removedItem])
  }

  const checkAnswer = (finalPlacement: (Item | null)[]) => {
    const isCorrect = finalPlacement.every((item, index) => item && item.id === items[index].id)
    if (!isCorrect) {
      setTimerActive(false); setGameOver(true); onFailure("الترتيب غير صحيح! حاول مرة أخرى")
      return
    }
    if (currentRound === 2) {
      setTimerActive(false); onSuccess()
    } else {
      setCurrentRound(currentRound + 1); setTimeout(generateNewRound, 1000)
    }
  }

  // --- Render Helpers ---
  const getClipPath = (shape: string) => {
    switch(shape) {
      case "circle": return "circle(50% at 50% 50%)";
      case "triangle": return "polygon(50% 0%, 0% 100%, 100% 100%)";
      case "diamond": return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
      case "star": return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
      case "hexagon": return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
      default: return "none";
    }
  }

  const renderShapeContent = (item: Item) => (
    <div 
      className="w-full h-full shadow-md" 
      style={{ 
        background: shapeGradients[item.color], 
        clipPath: getClipPath(item.shape), 
        borderRadius: item.shape === 'square' ? '1rem' : '0',
        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))'
      }} 
    />
  )

  // --- Main Render ---
  return (
    <div className="fixed inset-0 z-50 w-full h-full min-h-screen flex flex-col items-center p-4 md:p-8 overflow-hidden font-sans bg-[#FDFCF8] select-none touch-none">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />

      {/* --- Close Button --- */}
      <button 
        onClick={() => onFailure("تم إغلاق اللعبة يدوياً")}
        className="absolute top-4 left-4 z-50 p-2 bg-white border-2 border-[#3453a7]/20 rounded-full shadow-md text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-300 group"
      >
        <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* --- Header Bar (Timer & Round) --- */}
      <div className="relative z-10 w-full max-w-4xl flex justify-between items-center mb-6 mt-8 md:mt-0">
        <div className="flex items-center gap-3 bg-white border border-[#3453a7]/30 px-5 py-2.5 rounded-2xl shadow-sm">
            <Timer className={`w-6 h-6 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#3453a7]'}`} />
            <span className="text-2xl font-bold text-[#1a2332] tracking-widest font-mono">
                {String(timeLeft).padStart(2, '0')}
            </span>
        </div>

        <div className="flex items-center gap-2">
            <span className="text-[#1a2332]/60 text-sm font-medium uppercase tracking-wider">الجولة</span>
            <div className="flex items-center justify-center w-10 h-10 bg-[#3453a7] text-white rounded-xl shadow-md">
                <span className="font-bold text-lg font-mono">{currentRound}/2</span>
            </div>
        </div>
      </div>

      {/* --- Status & Instruction Bar (Modified) --- */}
      <div className="relative z-10 w-full max-w-2xl mb-8">
        <div className="flex flex-col w-full">
            <div className="flex justify-between items-end mb-2 px-2">
                 {/* Text is now always beige, and changes based on phase */}
                 <h3 className="text-xl font-bold text-[#3453a7] transition-all duration-300 select-none">
                    {phase === 'memorize' ? 'احفظ أماكن الأشكال' : 'أعد ترتيب الأشكال الآن'}
                 </h3>
                 {/* Timer count only shows in memorize phase */}
                 {phase === 'memorize' && (
                    <span className="font-mono text-xl font-bold text-[#3453a7] animate-pulse">
                        {memorizeTime}ث
                    </span>
                 )}
            </div>
            
            {/* Progress Bar - ONLY rendered during memorize phase */}
            {phase === 'memorize' && (
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner animate-in fade-in duration-300">
                  <div 
                      className="h-full transition-all duration-1000 ease-linear rounded-full bg-[#3453a7]"
                      style={{ 
                          width: `${(memorizeTime / 10) * 100}%`
                      }}
                  />
              </div>
            )}
        </div>
      </div>

      {/* --- Main Game Area --- */}
      <div className="relative z-10 flex-1 w-full max-w-4xl flex flex-col items-center justify-start gap-8">
        
        {/* Memory Phase */}
        {phase === "memorize" && (
          <div className="w-full bg-white border-2 border-[#3453a7]/10 rounded-3xl p-8 md:p-12 shadow-xl flex items-center justify-center animate-in fade-in zoom-in duration-500">
            <div className="flex flex-wrap gap-6 md:gap-8 justify-center items-center">
              {items.map((item) => (
                <div key={item.id} className="w-20 h-20 md:w-24 md:h-24 relative flex items-center justify-center animate-pulse-slow">
                   {renderShapeContent(item)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recall Phase */}
        {phase === "recall" && (
          <div className="w-full flex flex-col gap-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
            
            {/* DROP ZONES */}
            <div className="bg-white border-2 border-[#3453a7]/10 rounded-3xl p-6 md:p-8 shadow-lg">
              <div className="flex flex-wrap gap-4 md:gap-6 justify-center items-center min-h-[120px]">
                {placedItems.map((placedItem, index) => (
                  <div
                    key={index}
                    data-drop-slot={index}
                    className={`
                        relative w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-200
                        ${placedItem ? 'bg-white' : 'bg-gray-50 border-2 border-dashed border-[#3453a7]/30'}
                        ${activeDropZone === index ? 'border-2 border-[#3453a7] bg-[#3453a7]/10 scale-105' : ''}
                    `}
                  >
                    {placedItem ? (
                      <div 
                        onClick={() => handleRemoveFromSlot(index)} 
                        className="w-full h-full p-2 cursor-pointer hover:scale-95 transition-transform"
                      >
                         {renderShapeContent(placedItem)}
                      </div>
                    ) : (
                      <span className="text-3xl font-bold text-[#3453a7]/20 select-none font-mono">{index + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AVAILABLE ITEMS (Tray) */}
            <div className="bg-white border-t-4 border-[#3453a7] rounded-t-3xl md:rounded-3xl p-6 pb-20 md:pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 mb-4 text-[#1a2332]/60 text-sm font-semibold uppercase tracking-wider px-2">
                <Sparkles className="w-4 h-4 text-[#3453a7]" />
                <span>اسحب الأشكال للأعلى</span>
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center items-center min-h-[100px]">
                {availableItems.map((item) => {
                    const isBeingDragged = draggedItem?.id === item.id;
                    return (
                        <div 
                            key={item.id} 
                            onPointerDown={(e) => handlePointerDown(item, e)}
                            className={`
                                w-16 h-16 md:w-20 md:h-20 relative cursor-grab active:cursor-grabbing touch-none
                                transition-opacity duration-200
                                ${isBeingDragged ? 'opacity-0' : 'opacity-100 hover:scale-110'}
                            `}
                        >
                            {renderShapeContent(item)}
                        </div>
                    )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- DRAG OVERLAY --- */}
      {draggedItem && dragPosition && (
          <div 
            className="fixed z-[9999] pointer-events-none w-16 h-16 md:w-20 md:h-20"
            style={{ 
                left: dragPosition.x, 
                top: dragPosition.y,
                transform: 'scale(1.1)' 
            }}
          >
              {renderShapeContent(draggedItem)}
          </div>
      )}
    </div>
  )
}