"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

const EFFECTS: Record<string, { name: string; preview: JSX.Element }> = {
  default: {
    name: "الافتراضي",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, #f5f1e8, #e8ddc8)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-600 font-semibold">المظهر الافتراضي</span>
          </div>
        </div>
      </div>
    ),
  },
  bats: {
    name: "تأثير الخفافيش",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(249, 250, 251, 1), rgba(243, 244, 246, 1))",
          }}
        >
          {[
            { top: "15%", right: "20%", size: "14px", delay: "0s" },
            { top: "25%", left: "35%", size: "12px", delay: "0.6s" },
            { top: "50%", left: "50%", size: "13px", delay: "1.2s", center: true },
            { bottom: "20%", left: "25%", size: "10px", delay: "1.8s" },
            { bottom: "30%", right: "30%", size: "16px", delay: "2.4s" },
          ].map((bat, i) => (
            <div
              key={i}
              className="absolute animate-[fly_3s_ease-in-out_infinite]"
              style={{
                ...(bat.center
                  ? { top: bat.top, left: bat.left, transform: "translate(-50%, -50%)" }
                  : { top: bat.top, right: bat.right, left: bat.left, bottom: bat.bottom }),
                fontSize: bat.size,
                animationDelay: bat.delay,
                filter: "grayscale(100%) brightness(0)",
              }}
            >
              🦇
            </div>
          ))}
        </div>
      </div>
    ),
  },
  fire: {
    name: "تأثير النار",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(254, 243, 230, 1), rgba(253, 230, 200, 1))",
          }}
        >
          {[
            { top: "10%", right: "15%", size: "18px", delay: "0s" },
            { top: "20%", left: "30%", size: "16px", delay: "0.5s" },
            { top: "45%", left: "45%", size: "20px", delay: "1s", center: true },
            { bottom: "15%", left: "20%", size: "14px", delay: "1.5s" },
            { bottom: "25%", right: "25%", size: "22px", delay: "2s" },
          ].map((flame, i) => (
            <div
              key={i}
              className="absolute animate-[flicker_2s_ease-in-out_infinite]"
              style={{
                ...(flame.center
                  ? { top: flame.top, left: flame.left, transform: "translate(-50%, -50%)" }
                  : { top: flame.top, right: flame.right, left: flame.left, bottom: flame.bottom }),
                fontSize: flame.size,
                animationDelay: flame.delay,
                filter: "hue-rotate(-10deg) saturate(1.2)",
              }}
            >
              🔥
            </div>
          ))}
        </div>
      </div>
    ),
  },
  snow: {
    name: "تأثير الثلج",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(240, 249, 255, 1), rgba(224, 242, 254, 1))",
          }}
        >
          {[
            { top: "12%", right: "18%", size: "16px", delay: "0s" },
            { top: "22%", left: "32%", size: "14px", delay: "0.7s" },
            { top: "48%", left: "48%", size: "18px", delay: "1.4s", center: true },
            { bottom: "16%", left: "24%", size: "12px", delay: "2.1s" },
            { bottom: "26%", right: "26%", size: "20px", delay: "2.8s" },
          ].map((snow, i) => (
            <div
              key={i}
              className="absolute animate-[float_3s_ease-in-out_infinite]"
              style={{
                ...(snow.center
                  ? { top: snow.top, left: snow.left, transform: "translate(-50%, -50%)" }
                  : { top: snow.top, right: snow.right, left: snow.left, bottom: snow.bottom }),
                fontSize: snow.size,
                animationDelay: snow.delay,
                filter: "brightness(1.1)",
              }}
            >
              ❄️
            </div>
          ))}
        </div>
      </div>
    ),
  },
  leaves: {
    name: "تأثير ورق الشجر",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(240, 253, 244, 1), rgba(220, 252, 231, 1))",
          }}
        >
          {[
            { top: "14%", right: "16%", size: "17px", delay: "0s", animation: "leaf-float" },
            { top: "24%", left: "34%", size: "15px", delay: "0.6s", animation: "leaf-drift" },
            { top: "46%", left: "46%", size: "19px", delay: "1.2s", center: true, animation: "leaf-sway" },
            { bottom: "16%", left: "24%", size: "13px", delay: "1.8s", animation: "leaf-float" },
            { bottom: "26%", right: "26%", size: "21px", delay: "2.4s", animation: "leaf-drift" },
          ].map((leaf, i) => (
            <div
              key={i}
              className={`absolute animate-${leaf.animation}`}
              style={{
                ...(leaf.center
                  ? { top: leaf.top, left: leaf.left, transform: "translate(-50%, -50%)" }
                  : { top: leaf.top, right: leaf.right, left: leaf.left, bottom: leaf.bottom }),
                fontSize: leaf.size,
                animationDelay: leaf.delay,
                filter: "hue-rotate(0deg) saturate(1.3)",
              }}
            >
              🍃
            </div>
          ))}
        </div>
      </div>
    ),
  },
  royal: {
    name: "تأثير الملكية",
    preview: (
      <div className="relative w-32 h-20 overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(243, 232, 255, 1), rgba(236, 218, 255, 1))",
          }}
        >
          {[
            { top: "12%", right: "16%", size: "18px", delay: "0s" },
            { top: "22%", left: "34%", size: "16px", delay: "0.6s" },
            { top: "48%", left: "48%", size: "20px", delay: "1.2s", center: true },
            { bottom: "16%", left: "24%", size: "14px", delay: "1.8s" },
            { bottom: "26%", right: "26%", size: "22px", delay: "2.4s" },
          ].map((crown, i) => (
            <div
              key={i}
              className="absolute animate-[bounce_2s_ease-in-out_infinite]"
              style={{
                ...(crown.center
                  ? { top: crown.top, left: crown.left, transform: "translate(-50%, -50%)" }
                  : { top: crown.top, right: crown.right, left: crown.left, bottom: crown.bottom }),
                fontSize: crown.size,
                animationDelay: crown.delay,
                filter: "hue-rotate(270deg)",
              }}
            >
              👑
            </div>
          ))}
        </div>
      </div>
    ),
  },
}

interface EffectSelectorProps {
  studentId?: string
}

export function EffectSelector({ studentId }: EffectSelectorProps) {
  const [currentEffect, setCurrentEffect] = useState("default")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [ownedEffects, setOwnedEffects] = useState<string[]>(["default"])

  useEffect(() => {
    if (studentId) {
      loadFromDB()
    }
  }, [studentId])

  const loadFromDB = async () => {
    if (!studentId) return
    try {
      // Load owned effects from purchases API (merge with cache)
      const purchasesRes = await fetch(`/api/purchases?student_id=${studentId}`)
      const purchasesData = await purchasesRes.json()
      const cachedEffects: string[] = JSON.parse(localStorage.getItem(`effect_purchases_${studentId}`) || '[]')
      const dbEffects: string[] = Array.isArray(purchasesData.purchases)
        ? purchasesData.purchases.filter((id: string) => id.startsWith("effect_"))
        : []
      const mergedEffects = [...new Set([...cachedEffects, ...dbEffects])]
      const effects = mergedEffects.map((id: string) => id.replace("effect_", ""))
      setOwnedEffects(["default", ...effects])
      localStorage.setItem(`effect_purchases_${studentId}`, JSON.stringify(mergedEffects))

      // Load active effect from effects API (synced across devices)
      const effectRes = await fetch(`/api/effects?studentId=${studentId}`)
      const effectData = await effectRes.json()
      if (effectData.active_effect) {
        setCurrentEffect(effectData.active_effect)
        localStorage.setItem(`active_effect_${studentId}`, effectData.active_effect)
      } else {
        const cached = localStorage.getItem(`active_effect_${studentId}`)
        setCurrentEffect(cached || "default")
      }
    } catch (error) {
      console.error("Error loading effect data:", error)
      // Fallback to localStorage
      const purchases = localStorage.getItem(`effect_purchases_${studentId}`)
      if (purchases) {
        try {
          const purchaseList = JSON.parse(purchases)
          const effects = purchaseList.map((id: string) => id.replace("effect_", ""))
          setOwnedEffects(["default", ...effects])
        } catch {
          setOwnedEffects(["default"])
        }
      }
      const activeEffect = localStorage.getItem(`active_effect_${studentId}`)
      setCurrentEffect(activeEffect || "default")
    }
  }

  const handleEffectChange = async (effectName: string) => {
    if (!ownedEffects.includes(effectName)) {
      return
    }

    if (!studentId) {
      setSaveMessage("خطأ: معرف الطالب غير موجود")
      return
    }

    setSaving(true)
    setSaveMessage("جاري الحفظ...")

    try {
      // Save active effect to database so it syncs across devices
      const response = await fetch("/api/effects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, effect: effectName }),
      })

      if (response.ok) {
        localStorage.setItem(`active_effect_${studentId}`, effectName)
        setCurrentEffect(effectName)
        setSaveMessage("")
        setTimeout(() => {
          window.dispatchEvent(new Event("storage"))
        }, 500)
      } else {
        setSaveMessage("❌ خطأ في حفظ التأثير")
        setTimeout(() => setSaveMessage(""), 3000)
      }
    } catch (error) {
      console.error("Error saving effect:", error)
      setSaveMessage("❌ خطأ في حفظ التأثير")
      setTimeout(() => setSaveMessage(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#3453a7]" />
        <h3 className="text-lg font-bold text-[#1a2332]">اختر التأثير</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(EFFECTS)
          .filter(([key]) => ownedEffects.includes(key))
          .map(([key, effect]) => {
            const isActive = currentEffect === key
            return (
              <button
                key={key}
                onClick={() => handleEffectChange(key)}
                disabled={saving}
                className={`p-4 rounded-lg border-2 transition-all relative ${
                  isActive
                    ? "ring-2 shadow-lg border-[#22C55E]"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer"
                }`}
                style={
                  isActive
                    ? {
                        boxShadow: `0 0 0 2px #22C55E33`,
                      }
                    : undefined
                }
              >
                {isActive && (
                  <div className="absolute top-2 right-2 z-10 bg-[#22C55E] rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-center">{effect.preview}</div>
                  <div className="text-center">
                    <span className="font-semibold text-sm text-[#1a2332]">{effect.name}</span>
                  </div>
                </div>
              </button>
            )
          })}
      </div>

      {saveMessage && (
        <p className={`text-sm text-center ${saveMessage.includes("❌") ? "text-red-600" : "text-[#3453a7]"}`}>
          {saveMessage}
        </p>
      )}


      <style jsx global>{`
        @keyframes fly {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-8px) translateX(4px); }
          50% { transform: translateY(-4px) translateX(-4px); }
          75% { transform: translateY(-10px) translateX(2px); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }
        @keyframes leaf-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes leaf-drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        @keyframes leaf-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  )
}
