"use client"

import { useState, useEffect } from "react"
import { Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { JSX } from "react/jsx-runtime"

const FRAMES: Record<string, { name: string; preview: JSX.Element }> = {
  none: {
    name: "بدون إطار",
    preview: <div className="w-20 h-12 border-2 border-dashed border-gray-300 rounded-md" />,
  },
  bat: {
    name: "إطار الخفافيش",
    preview: (
      <div className="relative w-32 h-20">
        <div className="absolute inset-0 rounded-lg border-8 border-black bg-gray-900/10" />

        {/* Bat 1 - top left */}
        <div className="absolute -top-6 -left-6 w-12 h-12 text-black">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        {/* Bat 2 - top right */}
        <div className="absolute -top-6 -right-6 w-12 h-12 text-black">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        {/* Bat 3 - bottom */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 text-black">
          <svg viewBox="0 0 64 64" fill="currentColor">
            <path d="M32 8C30 8 28 9 28 11L28 14C26 14 24 15 22 17L18 15C16 14 14 15 14 17C14 19 15 21 17 22L20 24C18 26 17 28 17 31L17 36C17 38 18 40 20 41L18 43C16 44 15 46 15 48C15 50 16 51 18 51L22 49C24 51 26 52 28 52L28 55C28 57 30 58 32 58C34 58 36 57 36 55L36 52C38 52 40 51 42 49L46 51C48 51 49 50 49 48C49 46 48 44 46 43L44 41C46 40 47 38 47 36L47 31C47 28 46 26 44 24L47 22C49 21 50 19 50 17C50 15 48 14 46 15L42 17C40 15 38 14 36 14L36 11C36 9 34 8 32 8M32 18C34 18 35 19 36 20C37 21 38 22 40 23L44 21L41 24C42 25 43 27 43 30L43 35C43 37 42 38 41 39L44 41L40 39C38 40 37 41 36 42C35 43 34 44 32 44C30 44 29 43 28 42C27 41 26 40 24 39L20 41L23 39C22 38 21 37 21 35L21 30C21 27 22 25 23 24L20 21L24 23C26 22 27 21 28 20C29 19 30 18 32 18Z" />
          </svg>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">100</span>
        </div>
      </div>
    ),
  },
}

interface FrameSelectorProps {
  studentId?: string
}

export function FrameSelector({ studentId }: FrameSelectorProps) {
  const [currentFrame, setCurrentFrame] = useState("none")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [ownedFrames, setOwnedFrames] = useState<string[]>(["none"])

  useEffect(() => {
    if (studentId) {
      loadFromDB()
    }
  }, [studentId])

  const loadFromDB = async () => {
    if (!studentId) return
    try {
      // Load owned frames from purchases API (synced across devices)
      const purchasesRes = await fetch(`/api/purchases?student_id=${studentId}`)
      const purchasesData = await purchasesRes.json()
      if (purchasesData.purchases) {
        const frames = (purchasesData.purchases as string[])
          .filter((id) => id.startsWith("frame_"))
          .map((id) => id.replace("frame_", ""))
        setOwnedFrames(["none", ...frames])
        localStorage.setItem(`frame_purchases_${studentId}`, JSON.stringify(purchasesData.purchases.filter((id: string) => id.startsWith("frame_"))))
      }

      // Load active frame from frames API (synced across devices)
      const frameRes = await fetch(`/api/frames?studentId=${studentId}`)
      const frameData = await frameRes.json()
      if (frameData.active_frame) {
        setCurrentFrame(frameData.active_frame)
        localStorage.setItem(`active_frame_${studentId}`, frameData.active_frame)
      } else {
        const cached = localStorage.getItem(`active_frame_${studentId}`)
        if (cached) setCurrentFrame(cached)
      }
    } catch (error) {
      console.error("Error loading frame data:", error)
      // Fallback to localStorage
      const purchases = localStorage.getItem(`frame_purchases_${studentId}`)
      if (purchases) {
        try {
          const purchaseList = JSON.parse(purchases)
          const frames = purchaseList.map((id: string) => id.replace("frame_", ""))
          setOwnedFrames(["none", ...frames])
        } catch {
          setOwnedFrames(["none"])
        }
      }
      const activeFrame = localStorage.getItem(`active_frame_${studentId}`)
      if (activeFrame) setCurrentFrame(activeFrame)
    }
  }

  const handleFrameChange = (frameName: string) => {
    if (!ownedFrames.includes(frameName)) {
      return
    }
    setCurrentFrame(frameName)
    setSaveMessage("")
  }

  const handleSaveFrame = async () => {
    if (!studentId) {
      setSaveMessage("خطأ: معرف الطالب غير موجود")
      return
    }

    setSaving(true)
    setSaveMessage("")

    try {
      // Save to database so it's available on all devices
      const response = await fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, frame: currentFrame }),
      })

      if (response.ok) {
        localStorage.setItem(`active_frame_${studentId}`, currentFrame)
        setSaveMessage("✓ تم حفظ الإطار بنجاح")
        setTimeout(() => {
          window.dispatchEvent(new Event("storage"))
        }, 500)
      } else {
        setSaveMessage("خطأ في حفظ الإطار")
      }
    } catch (error) {
      console.error("Error saving frame:", error)
      setSaveMessage("خطأ في حفظ الإطار")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Square className="w-5 h-5 text-[#3453a7]" />
        <h3 className="text-lg font-bold text-[#1a2332]">اختر الإطار</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(FRAMES).map(([key, frame]) => {
          const isOwned = ownedFrames.includes(key)
          return (
            <button
              key={key}
              onClick={() => handleFrameChange(key)}
              disabled={!isOwned}
              className={`p-4 rounded-lg border-2 transition-all relative ${
                isOwned
                  ? currentFrame === key
                    ? "ring-2 shadow-lg border-[#3453a7]"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  : "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
              }`}
              style={
                isOwned && currentFrame === key
                  ? {
                      boxShadow: `0 0 0 2px #3453a733`,
                    }
                  : undefined
              }
            >
              <div className="space-y-2">
                <div className="flex justify-center">{frame.preview}</div>
                <div className="text-center">
                  <span className="font-semibold text-sm text-[#1a2332]">{frame.name}</span>
                  {!isOwned && <span className="block text-xs text-gray-500 mt-1">🔒 مقفل</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {studentId && (
        <div className="mt-6 space-y-2">
          <Button
            onClick={handleSaveFrame}
            disabled={saving || !ownedFrames.includes(currentFrame)}
            className="w-full bg-[#3453a7] hover:bg-[#4f73d1] text-white font-bold py-3 disabled:bg-gray-300"
          >
            {saving ? "جاري الحفظ..." : "حفظ الإطار"}
          </Button>
          {saveMessage && (
            <p className={`text-sm text-center ${saveMessage.includes("✓") ? "text-green-600" : "text-red-600"}`}>
              {saveMessage}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-center mt-4 text-gray-500">اشتر إطارات من المتجر لفتحها هنا</p>
    </div>
  )
}
