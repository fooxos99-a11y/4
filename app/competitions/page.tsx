"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Gamepad2, Grid3x3, Puzzle, Trophy, ChevronLeft, Swords, Loader2 } from "lucide-react"

const games = [
  {
    id: "categories",
    title: "لعبة الفئات",
    description: "لعبة تنافسية بين فريقين مع 4 فئات مختلفة",
    icon: Grid3x3,
    available: true,
    path: "/competitions/categories",
  },
  {
    id: "auction",
    title: "لعبة المزاد",
    description: "لعبة تنافسية مع نظام النقاط والأسئلة العشوائية",
    icon: Gamepad2,
    available: true,
    path: "/competitions/auction",
  },
  {
    id: "guess-images",
    title: "خمن الصورة",
    description: "اكتشف معنى الصورة قبل الفريق الآخر للفوز",
    icon: Puzzle,
    available: true,
    path: "/competitions/guess-images",
  },
  {
    id: "letter-hive",
    title: "خلية الحروف",
    description: "لعبة تنافسية بين فريقين لتوصيل اللون من الجهتين للفوز",
    icon: Grid3x3,
    available: true,
    path: "/competitions/letter-hive/teams",
  },
  {
    id: "millionaire-game",
    title: "من سيربح المليون",
    description: "لعبة ثقافية تعتمد على الإجابة عن أسئلة متدرجة الصعوبة للفوز بمليون",
    icon: Trophy,
    available: true,
    path: "/competitions/millionaire-game",
  },
  {
    id: "higher-lower",
    title: "أعلى أو أقل",
    description: "لعبة تحدي تعتمد على تخمين إذا كانت القيمة أعلى أو أقل من السابقة",
    icon: Puzzle,
    available: false,
    path: "/competitions/higher-lower",
  },
]

export default function CompetitionsPage() {
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    games.forEach((game) => {
      if (game.available) {
        router.prefetch(game.path)
      }
    })
  }, [router])

  const handleGameNavigation = (path: string, gameId: string) => {
    if (loadingGameId) {
      return
    }

    setLoadingGameId(gameId)
    requestAnimationFrame(() => {
      router.push(path)
    })
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">

          {/* Page Header */}
          <div className="border-b border-[#3453a7]/40 pb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#3453a7]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a2332]">المسابقات التفاعلية</h1>
          </div>

          {/* Games List */}
          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
            <div className="divide-y divide-[#3453a7]/20">
              {games.map((game) => (
                <button
                  key={game.id}
                  disabled={!game.available || loadingGameId !== null}
                  onClick={() => {
                    handleGameNavigation(game.path, game.id)
                  }}
                  className={`w-full flex items-center justify-between px-7 py-7 transition-colors text-right group ${
                    game.available && loadingGameId === null
                      ? "hover:bg-[#3453a7]/5 cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center shrink-0">
                      <game.icon className="w-7 h-7 text-[#3453a7]" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-[#1a2332]">{game.title}</span>
                        {!game.available && (
                          <span className="text-xs bg-neutral-100 text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full font-medium">
                            قريباً
                          </span>
                        )}
                      </div>
                      <p className="text-base text-neutral-400 mt-1">{game.description}</p>
                    </div>
                  </div>
                  {game.available && loadingGameId === game.id ? (
                    <div className="flex items-center gap-2 shrink-0 mr-2 text-[#3453a7]">
                      <span className="text-sm font-medium">جاري التحميل...</span>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : game.available ? (
                    <ChevronLeft className="w-6 h-6 text-neutral-300 group-hover:text-[#3453a7] transition-colors shrink-0 mr-2" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
