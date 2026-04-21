import { BookOpen, Heart, CheckCircle, Users } from 'lucide-react'

const siteGradient = 'linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)'

const goals = [
  {
    icon: BookOpen,
    title: "إتقان القرآن",
  },
  {
    icon: Heart,
    title: "ترسيخ القيم",
  },
  {
    icon: CheckCircle,
    title: "تعزيز الانضباط والمسؤولية",
  },
  {
    icon: Users,
    title: "إعداد جيل مؤثر في مجتمعه",
  },
]

export function GoalsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-10 sm:mb-12 md:mb-16 text-[#1a2332]">
          الأهداف
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
          {goals.map((goal, index) => (
            <div
              key={index}
              className="group flex flex-col items-center p-3 text-center transition-transform duration-300 hover:-translate-y-1 sm:p-4"
            >
              <div
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] shadow-[0_16px_32px_rgba(52,83,167,0.22)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95 sm:mb-5 sm:h-24 sm:w-24 sm:rounded-[24px]"
                style={{ background: siteGradient }}
              >
                <goal.icon className="h-8 w-8 text-white transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12" />
              </div>

              <h3 className="max-w-[11ch] text-sm font-bold leading-snug text-[#1a2332] transition-colors duration-300 group-hover:text-[#3453a7] sm:max-w-[12ch] sm:text-xl">
                {goal.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
