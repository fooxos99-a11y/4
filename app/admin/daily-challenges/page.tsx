"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus } from 'lucide-react'
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

type ChallengeType =
  | "multiple_choice"
  | "short_answer"
  | "puzzle"
  | "ordering"
  | "size_ordering"
  | "color_difference"
  | "math_problems"
  | "instant_memory"

export default function DailyChallengesAdmin() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الألعاب");

  const [isLoading, setIsLoading] = useState(true)
  const [weekSchedule, setWeekSchedule] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()

  const presetChallenges = [
    {
      id: "ordering_shapes",
      name: "تحدي الأشكال من الأكبر للأصغر",
      description: "اضغط على الأشكال من الأكبر للأصغر - 3 جولات",
      type: "size_ordering" as ChallengeType,
      challenge_type: "size_ordering",
    },
    {
      id: "color_difference",
      name: "تحدي اللون المختلف",
      description: "اعثر على الشكل الذي يختلف قليلاً في درجة اللون",
      type: "color_difference" as ChallengeType,
      challenge_type: "color_difference",
    },
    {
      id: "math_problems",
      name: "تحدي حل المسائل",
      description: "حل 5 مسائل رياضية بسيطة خلال 60 ثانية",
      type: "math_problems" as ChallengeType,
      challenge_type: "math_problems",
    },
    {
      id: "instant_memory",
      name: "لعبة الذاكرة اللحظية",
      description: "احفظ ترتيب الأشكال والألوان لمدة 10 ثواني ثم رتبها بشكل صحيح",
      type: "instant_memory" as ChallengeType,
      challenge_type: "instant_memory",
    },
  ]

  const daysOfWeek = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]

  const [formData, setFormData] = useState({
    type: "size_ordering",
    challenge_type: "size_ordering",
    title: "",
    description: "",
    points_reward: 20,
  })

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      loadSchedule()
    }
  }, [router])

  const loadSchedule = async () => {
    try {
      const savedChallenge = localStorage.getItem("todayChallenge")
      const todayDate = new Date().toISOString().split("T")[0]
      const savedDate = localStorage.getItem("challengeDate")

      const simulatedSchedule = [
        { title: "", description: "" },
        { title: "", description: "" },
        { title: "", description: "" },
        { title: "", description: "" },
        { title: "", description: "" },
        { title: "", description: "" },
        { title: "", description: "" },
      ]

      if (savedChallenge && savedDate === todayDate) {
        const challenge = JSON.parse(savedChallenge)
        simulatedSchedule[0] = {
          title: challenge.title,
          description: challenge.description,
        }
      }

      setWeekSchedule(simulatedSchedule)
    } catch (error) {
      console.error("[v0] Error:", error)
      setWeekSchedule([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPreset = (preset: any) => {
    setSelectedChallengeId(preset.id)
    setFormData({
      type: preset.type,
      challenge_type: preset.challenge_type,
      title: preset.name,
      description: preset.description,
      points_reward: 20,
    })
  }

  const handleSaveChallenge = async () => {
    setIsSubmitting(true)
    try {
      const todayDate = new Date().toISOString().split("T")[0]
      const challengeToSave = {
        ...formData,
        date: todayDate,
        id: Date.now().toString(),
      }

      localStorage.setItem("todayChallenge", JSON.stringify(challengeToSave))
      localStorage.setItem("challengeDate", todayDate)

      toast({
        title: "✓ تم الحفظ بنجاح",
        description: "التحدي متاح الآن للطلاب في صفحة التحدي اليومي",
        className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
      })
      setIsDialogOpen(false)
      setSelectedChallengeId("")
      loadSchedule()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-[#1a2332] mb-1 md:mb-2">إدارة التحدي اليومي</h1>
            <p className="text-sm md:text-lg text-[#1a2332]/70">ملاحظة: التحديات تتغير يوميا</p>
          </div>

          <div className="mb-4 md:mb-8">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white font-bold h-10 md:h-12 text-base md:text-lg w-full md:w-auto">
                  <Plus className="w-4 md:w-5 h-4 md:h-5 ml-1 md:ml-2" />
                  تغيير تحدي اليوم
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-2xl text-[#1a2332]">اختر التحدي المراد إضافته</DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 py-2 md:py-4 px-1">
                  <div className="space-y-2">
                    <Label className="text-sm md:text-base font-semibold">اختر التحدي</Label>
                    <div className="grid gap-2 md:gap-3">
                      {presetChallenges.map((preset) => (
                        <Card
                          key={preset.id}
                          className={`cursor-pointer transition-all ${
                            selectedChallengeId === preset.id
                              ? "border-2 md:border-4 border-[#3453a7] shadow-lg md:shadow-xl scale-[1.02] md:scale-105 bg-[#3453a7]/5"
                              : "border border-[#3453a7]/20 hover:border-[#3453a7]/50 hover:shadow-md"
                          }`}
                          onClick={() => handleSelectPreset(preset)}
                        >
                          <CardContent className="pt-2 md:pt-4 p-2 md:p-4">
                            <h3 className="font-bold text-[#1a2332] text-sm md:text-base">{preset.name}</h3>
                            <p className="text-xs md:text-sm text-[#1a2332]/70">{preset.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 md:gap-3 pt-3 border-t border-gray-200 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setSelectedChallengeId("")
                    }}
                    className="font-bold text-xs md:text-base px-3 md:px-4 h-9 md:h-10"
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSaveChallenge}
                    className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#3453a7] text-white font-bold text-xs md:text-base px-3 md:px-4 h-9 md:h-10"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "جاري الحفظ..." : "حفظ التحدي"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
