"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Edit2, Save, X } from "lucide-react"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface AdminData {
  id: string
  name: string
  account_number: number
  id_number: string | null
  phone_number: string | null
  role: string
}

function createFallbackAdminData() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const currentUser = localStorage.getItem("currentUser")
    if (!currentUser) {
      return null
    }

    const parsedUser = JSON.parse(currentUser) as {
      id?: string
      name?: string
      role?: string
      account_number?: number | string
    }

    if (!parsedUser?.id || !parsedUser?.name || !parsedUser?.account_number) {
      return null
    }

    return {
      id: String(parsedUser.id),
      name: parsedUser.name,
      account_number: Number(parsedUser.account_number),
      id_number: null,
      phone_number: null,
      role: parsedUser.role || "admin",
    } satisfies AdminData
  } catch {
    return null
  }
}

export default function AdminProfilePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth();

  const [isLoading, setIsLoading] = useState(true)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [editedPhoneNumber, setEditedPhoneNumber] = useState("")
  const [editedIdNumber, setEditedIdNumber] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [usingFallbackData, setUsingFallbackData] = useState(false)
  const router = useRouter()
  const alertDialog = useAlertDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher" || !userRole) {
      router.push("/login")
    } else {
      fetchAdminData()
    }
  }, [router])

  const fetchAdminData = async () => {
    const fallbackAdminData = createFallbackAdminData()

    try {
      const response = await fetch("/api/admin-users?current=1", { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok) {
        console.error("[v0] Error fetching admin data:", payload)
        if (fallbackAdminData) {
          setAdminData(fallbackAdminData)
          setEditedName(fallbackAdminData.name || "")
          setEditedPhoneNumber(fallbackAdminData.phone_number || "")
          setEditedIdNumber(fallbackAdminData.id_number || "")
          setUsingFallbackData(true)
          return
        }

        await alertDialog("حدث خطأ أثناء تحميل البيانات")
        return
      }

      const data = payload.user || null

      if (data) {
        setAdminData(data)
        setEditedName(data.name || "")
        setEditedPhoneNumber(data.phone_number || "")
        setEditedIdNumber(data.id_number || "")
        setUsingFallbackData(false)
        return
      }

      if (fallbackAdminData) {
        setAdminData(fallbackAdminData)
        setEditedName(fallbackAdminData.name || "")
        setEditedPhoneNumber(fallbackAdminData.phone_number || "")
        setEditedIdNumber(fallbackAdminData.id_number || "")
        setUsingFallbackData(true)
      }
    } catch (error) {
      console.error("[v0] Error fetching admin data:", error)
      if (fallbackAdminData) {
        setAdminData(fallbackAdminData)
        setEditedName(fallbackAdminData.name || "")
        setEditedPhoneNumber(fallbackAdminData.phone_number || "")
        setEditedIdNumber(fallbackAdminData.id_number || "")
        setUsingFallbackData(true)
        return
      }

      await alertDialog("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!adminData) return

    const normalizedName = editedName.trim()
    if (!normalizedName) {
      await alertDialog("يرجى إدخال الاسم الكامل")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: adminData.id,
          name: normalizedName,
          phone_number: editedPhoneNumber || null,
          id_number: editedIdNumber || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload?.success) {
        console.error("[v0] Error updating admin data:", payload)
        await alertDialog("حدث خطأ أثناء حفظ البيانات")
        return
      }

      localStorage.setItem("userName", normalizedName)
      try {
        const currentUser = localStorage.getItem("currentUser")
        if (currentUser) {
          const parsedUser = JSON.parse(currentUser)
          localStorage.setItem("currentUser", JSON.stringify({ ...parsedUser, name: normalizedName }))
        }
      } catch {
        // ignore local storage sync errors
      }
      await alertDialog("تم حفظ التعديلات بنجاح")
      setIsEditing(false)
      fetchAdminData()
    } catch (error) {
      console.error("[v0] Error updating admin data:", error)
      await alertDialog("حدث خطأ أثناء حفظ البيانات")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedName(adminData?.name || "")
    setEditedPhoneNumber(adminData?.phone_number || "")
    setEditedIdNumber(adminData?.id_number || "")
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!adminData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl text-[#1a2332] mb-4">لم يتم العثور على بيانات الإداري</p>
            <Button
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#b88341] text-[#20335f] font-bold"
            >
              العودة لتسجيل الدخول
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] rounded-3xl shadow-2xl p-8 mb-8 text-white">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl">
                <User className="w-12 h-12 text-[#3453a7]" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-start gap-3">
                  <h1 className="text-4xl font-bold">{adminData.name}</h1>
                </div>
                <p className="text-xl opacity-90">حساب إداري</p>
              </div>
            </div>
          </div>

          <Card className="border-2 border-[#3453a7]/20 shadow-lg">
            <CardHeader className="bg-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-[#1a2332]">البيانات الشخصية</CardTitle>
                <CardDescription className="text-base">
                  {usingFallbackData ? "عرض محلي مؤقت للحساب الإداري" : "معلومات الحساب الإداري"}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#b88341] text-white font-bold"
                >
                  <Edit2 className="w-4 h-4 ml-2" />
                  تعديل البيانات
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]/70">رقم الحساب</Label>
                  <div className="p-4 bg-gray-50 rounded-xl text-lg font-bold text-[#1a2332]">
                    {adminData.account_number}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]/70">الاسم الكامل</Label>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="أدخل الاسم الكامل"
                      className="text-lg font-bold"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-lg font-bold text-[#1a2332]">{adminData.name}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]/70">نوع الحساب</Label>
                  <div className="p-4 bg-gray-50 rounded-xl text-lg font-bold text-[#1a2332]">إداري</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]/70">رقم الهوية</Label>
                  {isEditing ? (
                    <Input
                      value={editedIdNumber}
                      onChange={(e) => setEditedIdNumber(e.target.value)}
                      placeholder="أدخل رقم الهوية"
                      className="text-lg font-bold"
                      dir="ltr"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-lg font-bold text-[#1a2332]">
                      {adminData.id_number || "غير محدد"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]/70">رقم الجوال</Label>
                  {isEditing ? (
                    <Input
                      value={editedPhoneNumber}
                      onChange={(e) => setEditedPhoneNumber(e.target.value)}
                      placeholder="أدخل رقم الجوال"
                      className="text-lg font-bold"
                      dir="ltr"
                      type="tel"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl text-lg font-bold text-[#1a2332]" dir="ltr">
                      {adminData.phone_number || "غير محدد"}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="font-bold bg-transparent"
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 ml-2" />
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-[#3453a7] to-[#4f73d1] hover:from-[#4f73d1] hover:to-[#b88341] text-[#20335f] font-bold"
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
