"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import AdminNotificationsClient from "./admin-notifications-client"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function AdminNotificationsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإشعارات");

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dir-rtl font-cairo">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <AdminNotificationsClient />
      </main>
      <Footer />
    </div>
  )
}
