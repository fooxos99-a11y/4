
"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { Award, Trophy, Medal, Verified, Trash2, Plus } from 'lucide-react'
import { useEffect, useState } from "react"

function ConfirmDialog({ open, onConfirm, onCancel, message }: { open: boolean, onConfirm: () => void, onCancel: () => void, message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center border border-[#3453a7]/30">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <div className="text-lg font-bold mb-2 text-[#1a2332]">تأكيد الحذف</div>
        <div className="mb-6 text-sm text-neutral-500">{message}</div>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-5 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50 text-sm transition-colors">إلغاء</button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 text-sm transition-colors">حذف</button>
        </div>
      </div>
    </div>
  )
}

function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState({
    icon_type: "trophy",
    title: "",
    date: "",
    student_name: "",
    description: "",
    category: "",
    image_file: null as File | null,
    image_url: ""
  })
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, id: string | null }>({ open: false, id: null })
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    setUserRole(typeof window !== 'undefined' ? localStorage.getItem("userRole") : null)
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/achievements")
        const data = await response.json()
        setAchievements(data.achievements || [])
      } catch (error) {
        console.error("[v0] Error fetching achievements:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case "trophy": return Trophy
      case "award": return Award
      case "medal": return Medal
      case "certificate": return Verified
      default: return Trophy
    }
  }

  const handleDeleteAchievement = (id: string) => {
    setConfirmDialog({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!confirmDialog.id) return;
    try {
      const res = await fetch(`/api/achievements?id=${confirmDialog.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        const refreshed = await fetch("/api/achievements");
        const refreshedData = await refreshed.json();
        setAchievements(refreshedData.achievements || []);
      } else {
        alert(data.error || "حدث خطأ أثناء حذف الإنجاز");
      }
    } catch {
      alert("حدث خطأ في الاتصال بالخادم");
    }
    setConfirmDialog({ open: false, id: null })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader />
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <ConfirmDialog
        open={confirmDialog.open}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null })}
        message="هل أنت متأكد أنك تريد حذف هذا الإنجاز؟"
      />

      {/* نافذة إضافة إنجاز */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#3453a7]/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#3453a7]/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#3453a7]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">إضافة إنجاز جديد</h2>
              </div>
              <button onClick={() => setIsDialogOpen(false)} className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-400 hover:bg-neutral-50 transition-colors text-lg leading-none">&times;</button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                let imageUrl = "";
                if (form.icon_type === "image" && form.image_file) {
                  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                  const { createClient } = await import("@supabase/supabase-js");
                  const supabase = createClient(supabaseUrl, supabaseKey);
                  const fileExt = form.image_file.name.split('.').pop();
                  const fileName = `achievement_${Date.now()}.${fileExt}`;
                  const { error: uploadError } = await supabase.storage.from("achievements").upload(fileName, form.image_file);
                  if (uploadError) { alert("فشل رفع الصورة: " + uploadError.message); return; }
                  imageUrl = `${supabaseUrl}/storage/v1/object/public/achievements/${fileName}`;
                }
                try {
                  const res = await fetch("/api/achievements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...form, category: form.category || "", image_url: imageUrl || form.image_url, image_file: undefined })
                  });
                  const data = await res.json();
                  if (data.success && data.achievement) {
                    setAchievements(prev => [data.achievement, ...prev]);
                  } else {
                    alert(data.error || "حدث خطأ أثناء إضافة الإنجاز");
                  }
                } catch { alert("حدث خطأ في الاتصال بالخادم"); }
                setIsDialogOpen(false);
                setForm({ icon_type: "trophy", title: "", date: "", student_name: "", description: "", category: "", image_file: null, image_url: "" });
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]/70">الأيقونة</label>
                <select className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-[#1a2332] focus:outline-none focus:border-[#3453a7]/60 bg-white" value={form.icon_type} onChange={e => setForm(f => ({ ...f, icon_type: e.target.value }))}>
                  <option value="trophy">🏆 كأس</option>
                  <option value="award">🎖️ ميدالية</option>
                  <option value="certificate">📜 شهادة</option>
                  <option value="image">🖼️ صورة</option>
                </select>
              </div>
              {form.icon_type === "image" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#1a2332]/70">رفع صورة الإنجاز</label>
                  <input type="file" accept="image/*" className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm" onChange={e => { const file = e.target.files && e.target.files[0]; setForm(f => ({ ...f, image_file: file || null })); }} />
                  {form.image_file && (
                    <div className="mt-2 flex justify-center">
                      <img src={URL.createObjectURL(form.image_file)} alt="معاينة" className="max-h-24 rounded-xl shadow border border-[#3453a7]/20" style={{maxWidth: '150px'}} />
                    </div>
                  )}
                </div>
              )}
              {[
                { key: "title", label: "العنوان", type: "text", required: true },
                { key: "student_name", label: "اسم الطالب", type: "text", required: true },
                { key: "date", label: "التاريخ", type: "date", required: true },
              ].map(({ key, label, type, required }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#1a2332]/70">{label}</label>
                  <input type={type} required={required} className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-[#1a2332] focus:outline-none focus:border-[#3453a7]/60" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]/70">الوصف</label>
                <textarea required rows={3} className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm text-[#1a2332] focus:outline-none focus:border-[#3453a7]/60 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/50 text-[#4f73d1] hover:bg-[#3453a7]/20 hover:text-[#3453a7] font-bold text-sm transition-colors">
                إضافة الإنجاز
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Page Header */}
          <div className="flex flex-col items-center justify-center border-b border-[#3453a7]/40 pb-8 text-center relative mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-[#3453a7]" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a2332]">الإنجازات</h1>
            
            {(userRole && userRole !== "student" && userRole !== "teacher") && (
              <button
                onClick={() => setIsDialogOpen(true)}
                className="absolute top-0 right-0 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة إنجاز
              </button>
            )}
          </div>

          {/* Achievements */}
          {achievements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm py-16 flex flex-col items-center gap-3 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mb-2">
                <Trophy className="w-7 h-7 text-[#3453a7]" />
              </div>
              <p className="text-lg font-semibold text-neutral-500">لا توجد إنجازات حالياً</p>
            </div>
          ) : (
            <div className="space-y-4">
              {achievements.map((achievement) => {
                const IconComponent = getIconComponent(achievement.icon_type)
                return (
                  <div key={achievement.id} className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      {/* Icon / Image panel */}
                      <div className="sm:w-44 sm:h-auto flex-shrink-0 bg-[#3453a7]/5 border-b sm:border-b-0 sm:border-l border-[#3453a7]/20 flex items-center justify-center relative">
                        {achievement.image_url ? (
                          <img src={achievement.image_url} alt={achievement.title} className="w-full h-auto sm:h-full sm:object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                            <IconComponent className="w-8 h-8 text-[#3453a7]" />
                          </div>
                        )}
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#3453a7] to-[#4f73d1]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 relative">
                        {(userRole && userRole !== "student" && userRole !== "teacher") && (
                          <button
                            onClick={() => handleDeleteAchievement(achievement.id)}
                            className="absolute top-4 left-4 w-8 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {achievement.category && (
                          <span className="inline-block bg-[#3453a7]/10 border border-[#3453a7]/30 px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#4f73d1] mb-3">
                            {achievement.category}
                          </span>
                        )}
                        <h2 className="text-lg font-bold text-[#1a2332] mb-1">{achievement.title}</h2>
                        <p className="text-sm font-semibold text-[#3453a7] mb-2">{achievement.student_name}</p>
                        <p className="text-sm text-neutral-500 leading-relaxed mb-3">{achievement.description}</p>
                        <p className="text-xs text-neutral-400">{achievement.date}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  )
}

export default AchievementsPage
