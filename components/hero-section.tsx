"use client"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-10 pt-0 sm:px-6 sm:pb-14 sm:pt-0 lg:pb-20 lg:pt-0">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#3453a7]/45 to-transparent" />

      <div className="container relative mx-auto">
        <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col items-center justify-center gap-4 py-16 sm:py-20 lg:gap-6 lg:py-24">
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-5xl pb-3 bg-[linear-gradient(135deg,#20335f_0%,#3453a7_58%,#7d9ff5_100%)] bg-clip-text text-balance text-4xl font-black leading-[1.18] tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              <span className="block">مجمع الملك خالد</span>
            </h1>

            <div className="mt-3 h-1.5 w-28 rounded-full bg-[linear-gradient(90deg,#3453a7_0%,#8fb0ff_50%,#3453a7_100%)] shadow-[0_8px_22px_rgba(52,83,167,0.18)]" />

            <p className="mt-4 max-w-4xl text-base leading-8 text-[#4b5563] sm:mt-5 sm:text-xl sm:leading-9 lg:text-2xl lg:leading-[1.8]">
              مجمع الملك خالد لتحفيظ القران الكريم يسعى لتقديم بيئة تربوية متميزة تجمع بين الأصالة والمعاصرة.
              نهدف إلى تخريج جيل قرآني متقن لكتاب الله، ملتزم بتعاليمه، قادر على خدمة دينه ومجتمعه. مع التركيز على
              الجودة والإتقان والمتابعة المستمرة لكل طالب.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
