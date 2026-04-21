"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { Award, Upload } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function AchievementsManagementPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب");

  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const router = useRouter()


  // جلب الإنجازات من API
  const fetchAchievements = async () => {
    try {
      const res = await fetch("/api/achievements")
      const data = await res.json()
      setAchievements(data.achievements || [])
    } catch (error) {
      // يمكن عرض رسالة خطأ هنا
    }
  }

  useEffect(() => {
    fetchAchievements()
  }, [])

  const handleAddAchievement = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          description,
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          achievement_type: "student",
          image_url: null
        })
      })
      if (res.ok) {
        setTitle("")
        setDate("")
        setDescription("")
        setImage(null)
        fetchAchievements()
      } else {
        // يمكن عرض رسالة خطأ هنا
      }
    } catch (error) {
      // يمكن عرض رسالة خطأ هنا
    }
    setIsSubmitting(false)
  }

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Award className="w-7 h-7 text-[#3453a7]" /> إدارة الإنجازات
      </h1>
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-4">إضافة إنجاز جديد</h2>
        <div className="grid gap-4">
          <div>
            <Label>عنوان الإنجاز</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوان الإنجاز" />
          </div>
          <div>
            <Label>التاريخ</Label>
            <Input value={date} onChange={e => setDate(e.target.value)} placeholder="مثال: 15 محرم 1446هـ" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="أدخل وصف الإنجاز" />
          </div>
          <Button onClick={handleAddAchievement} disabled={isSubmitting} className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-[#20335f] font-bold">
            {isSubmitting ? "جاري الإضافة..." : "إضافة الإنجاز"}
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4">الإنجازات الحالية</h2>
        {/* عرض الإنجازات هنا */}
        {achievements.length === 0 ? (
          <div className="text-gray-500 text-center py-8">لا توجد إنجازات حالياً</div>
        ) : (
          <ul className="space-y-4">
            {achievements.map((ach, idx) => (
              <li key={idx} className="border rounded-lg p-3">
                <div className="font-bold">{ach.title}</div>
                <div className="text-sm text-gray-500">{ach.date}</div>
                <div className="text-sm">{ach.description}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
