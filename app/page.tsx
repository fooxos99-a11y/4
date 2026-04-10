import { cookies } from "next/headers"

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { GoalsSection } from "@/components/goals-section"
import { AboutSection } from "@/components/about-section"
import { VisionSection } from "@/components/vision-section"
import { Footer } from "@/components/footer"
import { SESSION_COOKIE_NAME, verifySignedSessionToken } from "@/lib/auth/session"

export default async function Home() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  await verifySignedSessionToken(sessionCookie)

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      <Header />
      <main>
        <HeroSection />
        <div className="bg-white min-h-screen">
          <GoalsSection />
          <AboutSection />
          <VisionSection />
        </div>
      </main>
      <Footer />
    </div>
  )
}
