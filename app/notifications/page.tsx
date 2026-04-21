import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import NotificationsClient from "./notifications-client"

export default function NotificationsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white dir-rtl font-cairo">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <NotificationsClient />
      </main>
      <Footer />
    </div>
  )
}
