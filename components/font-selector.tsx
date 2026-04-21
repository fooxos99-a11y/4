"use client"

import { useEffect, useState } from "react"
import { SiteLoader } from "@/components/ui/site-loader"
import { toast } from "sonner"

const fonts = [
  { id: "font_cairo", name: "القاهرة", font: "'Cairo', sans-serif" },
  { id: "font_amiri", name: "الأميري", font: "'Amiri', serif" },
  { id: "font_tajawal", name: "تجول", font: "'Tajawal', sans-serif" },
  { id: "font_changa", name: "تشانغا", font: "'Changa', sans-serif" },
]

interface FontSelectorProps {
  studentId?: string
}

export function FontSelector({ studentId }: FontSelectorProps) {
  const [selectedFont, setSelectedFont] = useState<string | null>(null)
  const [purchasedFonts, setPurchasedFonts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadFontData()
  }, [studentId])

  const loadFontData = async () => {
    try {
      if (!studentId) return

      const purchases = localStorage.getItem(`purchases_${studentId}`)
      if (purchases) {
        const purchasedItems = JSON.parse(purchases)
        const fontPurchases = purchasedItems.filter((p: string) => p.startsWith("font_"))
        setPurchasedFonts(fontPurchases)
      }

      const response = await fetch(`/api/fonts?t=${Date.now()}`, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        const font = data.fonts?.[studentId]
        setSelectedFont(font || null)
        console.log("[v0] Loaded active font:", font)
      }
    } catch (error) {
      console.error("[v0] Error loading font data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFontSelect = async (fontId: string) => {
    if (!purchasedFonts.includes(fontId)) {
      toast.error("يجب عليك شراء هذا الخط من المتجر أولاً")
      return
    }

    setSelectedFont(fontId)

    try {
      const response = await fetch("/api/fonts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          font_id: fontId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save font")
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[v0] Font saved successfully:", fontId)
      toast.success("تم حفظ الخط بنجاح")

      // Trigger refresh for other components
      window.dispatchEvent(new Event("fontChanged"))
    } catch (error) {
      console.error("[v0] Error saving font:", error)
      toast.error("حدث خطأ أثناء حفظ الخط")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#1a2332]">الخط</h3>
        <div className="flex justify-center py-2">
          <SiteLoader size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="text-xl font-bold text-[#1a2332]">الخط</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {fonts.filter((font) => purchasedFonts.includes(font.id)).map((font) => {
          const isActive = selectedFont === font.id
          return (
            <button
              key={font.id}
              onClick={() => handleFontSelect(font.id)}
              className={`relative p-6 rounded-xl border-3 transition-all duration-300 ${
                isActive
                  ? "border-[#3453a7] bg-gradient-to-br from-[#3453a7]/10 to-[#4f73d1]/10 shadow-lg scale-105"
                  : "border-gray-200 hover:border-[#3453a7]/50 hover:shadow-md"
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ fontFamily: font.font }}>
                  {font.name}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
