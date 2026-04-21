// صفحة إدارة الإنجازات العامة فقط (تظهر في صفحة الإنجازات)
"use client"

import { useState, useEffect } from "react"
import { Award, Upload, FileText } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function AdminAchievementsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب")

  if (authLoading || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  const [achievements, setAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const fetchAchievements = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/achievements")
        const data = await response.json()
        setAchievements((data.achievements || []).filter((a:any) => a.achievement_type === "public"))
      } catch (error) {
        setAchievements([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  const [newAchievement, setNewAchievement] = useState<{
    title: string;
    date: string;
    description: string;
    status: string;
    level: string;
    icon_type: string;
    image: File | null;
    image_url: string;
  }>({
    title: "",
    date: "",
    description: "",
    status: "مكتمل",
    level: "ممتاز",
    icon_type: "trophy",
    image: null,
    image_url: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingAchievementImage, setUploadingAchievementImage] = useState(false)

  const handleAddAchievement = async () => {
    setIsSubmitting(true)
    let imageUrl = ""
    try {
      if (newAchievement.image) {
        setUploadingAchievementImage(true)
        const formData = new FormData()
        formData.append("file", newAchievement.image)
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (!uploadResponse.ok) throw new Error("فشل رفع الصورة")
        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        setUploadingAchievementImage(false)
      }
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAchievement,
          image_url: imageUrl,
          achievement_type: "public",
        }),
      })
      if (response.ok) {
        alert("تم إضافة الإنجاز العام بنجاح!")
        setNewAchievement({
          title: "",
          date: "",
          description: "",
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          image: null,
          image_url: "",
        })
        // إعادة تحميل الإنجازات بعد الإضافة
        const achievementsRes = await fetch("/api/achievements")
        const achievementsData = await achievementsRes.json()
        setAchievements((achievementsData.achievements || []).filter((a:any) => a.achievement_type === "public"))
      } else {
        alert("فشل في إضافة الإنجاز")
      }
    } catch (e) {
      alert("حدث خطأ أثناء إضافة الإنجاز")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">إدارة الإنجازات العامة (تظهر في صفحة الإنجازات)</h1>
      <div className="space-y-3 mb-8">
        <input className="w-full border p-2 rounded" placeholder="عنوان الإنجاز" value={newAchievement.title} onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })} />
        <input className="w-full border p-2 rounded" placeholder="التاريخ" value={newAchievement.date} onChange={e => setNewAchievement({ ...newAchievement, date: e.target.value })} />
        <input className="w-full border p-2 rounded" placeholder="الوصف" value={newAchievement.description} onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })} />
        <input type="file" accept="image/*" onChange={e => setNewAchievement({ ...newAchievement, image: e.target.files && e.target.files[0] ? e.target.files[0] : null })} />
        <button className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white font-bold py-2 rounded" onClick={handleAddAchievement} disabled={isSubmitting || uploadingAchievementImage}>
          {uploadingAchievementImage ? "جاري رفع الصورة..." : isSubmitting ? "جاري الإضافة..." : "إضافة الإنجاز"}
        </button>
      </div>
      <hr className="my-6" />
      <h2 className="text-xl font-bold mb-4">قائمة الإنجازات العامة</h2>
      {isLoading ? (
        <div className="flex justify-center py-8"><SiteLoader /></div>
      ) : achievements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">لا توجد إنجازات عامة حالياً</div>
      ) : (
        <div className="space-y-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="border rounded-lg p-4 flex items-center gap-4">
              {achievement.image_url && (
                <img src={achievement.image_url} alt={achievement.title} className="w-16 h-16 object-cover rounded" />
              )}
              <div className="flex-1">
                <div className="font-bold text-[#1a2332]">{achievement.title}</div>
                <div className="text-sm text-gray-600">{achievement.description}</div>
                <div className="text-xs text-gray-400">{achievement.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
