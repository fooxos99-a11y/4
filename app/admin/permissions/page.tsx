"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Archive,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Map,
  MessageSquare,
  QrCode,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { PERMISSION_FALLBACKS, hasPermissionAccess } from "@/lib/admin-permissions"

const PERMISSION_SECTIONS = [
  {
    title: "إدارة الطلاب",
    items: [
      { key: "إدارة الطلاب", icon: Users },
      { key: "إدارة الاختبارات", icon: ClipboardCheck },
    ],
  },
  {
    title: "إدارة المستخدمين",
    items: [
      { key: "إدارة المعلمين", icon: Settings },
      { key: "إدارة الحلقات", icon: BookOpen },
      { key: "الهيكل الإداري", icon: ShieldCheck },
      { key: "طلبات التسجيل", icon: UserPlus },
    ],
  },
  {
    title: "التقارير",
    items: [
      { key: "التقارير", icon: FileText },
      { key: "تقارير المعلمين", icon: FileText },
      { key: "تقارير الرسائل", icon: MessageSquare },
      { key: "السجل اليومي للطلاب", icon: FileText },
      { key: "الإحصائيات", icon: BarChart3 },
    ],
  },
  {
    title: "الإدارة العامة",
    items: [
      { key: "إدارة المسار", icon: Map },
      { key: "إدارة المتجر", icon: ShoppingBag },
      { key: "يوم السرد", icon: Archive },
      { key: "الإشعارات", icon: Bell },
      { key: "الصلاحيات", icon: ShieldCheck },
      { key: "المالية", icon: Banknote },
      { key: "الإرسال إلى أولياء الأمور", icon: MessageSquare },
      { key: "باركود الواتساب", icon: QrCode },
      { key: "إنهاء الفصل", icon: Calendar },
    ],
  },
  {
    title: "الألعاب",
    items: [
      { key: "إدارة الألعاب", icon: Zap },
    ],
  },
] as const

const ALL_PERMISSION_ITEMS = PERMISSION_SECTIONS.flatMap((section) => section.items)

const MERGED_PERMISSION_GROUPS: Record<string, string[]> = {
  "إدارة الطلاب": [
    "إضافة طالب",
    "إضافة جماعية",
    "إزالة طالب",
    "نقل طالب",
    "تعديل بيانات الطالب",
    "تعديل نقاط الطالب",
    "سجلات الطلاب",
    "إنجازات الطلاب",
    "خطط الطلاب",
  ],
  "إدارة الألعاب": [
    "إدارة صور خمن الصورة",
    "إدارة أسئلة المزاد",
    "إدارة من سيربح المليون",
    "إدارة خلية الحروف",
    "إدارة أسئلة الفئات",
  ],
}

const DEFAULT_ROLES = ["سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]

type PermissionsMap = Record<string, string[]>

export default function PermissionsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الصلاحيات");

  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES)
  const [permissions, setPermissions] = useState<PermissionsMap>({})
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
      return
    }
    fetchData()
  }, [router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/roles")
      const data = await res.json()
      const fetchedRoles: string[] = (data.roles || DEFAULT_ROLES).filter((r: string) => r !== "مدير")
      const fetchedPerms: PermissionsMap = data.permissions || {}
      const normalized: PermissionsMap = {}
      fetchedRoles.forEach((r: string) => { normalized[r] = fetchedPerms[r] || [] })
      setRoles(fetchedRoles)
      setPermissions(normalized)
      if (fetchedRoles.length > 0) setSelectedRole(fetchedRoles[0])
    } catch {
      toast({ title: "خطأ", description: "تعذر جلب بيانات الصلاحيات", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const getInheritedPermissionSource = (rolePermissions: string[], permissionKey: string) => {
    const fallbacks = PERMISSION_FALLBACKS[permissionKey] || []
    return fallbacks.find((permission) => rolePermissions.includes(permission)) || null
  }

  const togglePermission = (action: string) => {
    if (!selectedRole) return
    setPermissions(prev => {
      const current = prev[selectedRole] || []
      const inheritedFrom = getInheritedPermissionSource(current, action)

      if (inheritedFrom && !current.includes(action)) {
        toast({
          title: "صلاحية موروثة",
          description: `"${action}" مفعلة حالياً عبر "${inheritedFrom}". عطّل الصلاحية الأم أولاً إذا أردت تخصيصها.`,
        })
        return prev
      }

      const has = current.includes(action)
      if (has) {
        const relatedPermissions = MERGED_PERMISSION_GROUPS[action] || []
        return {
          ...prev,
          [selectedRole]: current.filter((permission) => permission !== action && !relatedPermissions.includes(permission)),
        }
      }

      return { ...prev, [selectedRole]: [...current, action] }
    })
  }

  const toggleAll = () => {
    if (!selectedRole) return
    const current = permissions[selectedRole] || []
    const allGranted = ALL_PERMISSION_ITEMS.every(({ key }) => hasPermissionAccess(current, key))
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: allGranted ? [] : ALL_PERMISSION_ITEMS.map(({ key }) => key),
    }))
  }

  const savePermissions = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/roles")
      const data = await res.json()
      const saveRes = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: data.roles || roles, permissions })
      })
      if (saveRes.ok) {
        toast({ title: " تم الحفظ", description: `تم حفظ صلاحيات "${selectedRole}" بنجاح` })
      } else throw new Error("save failed")
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ الصلاحيات", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const currentPerms = permissions[selectedRole] || []

  const grantedCount = ALL_PERMISSION_ITEMS.filter(({ key }) => hasPermissionAccess(currentPerms, key)).length
  const totalCount = ALL_PERMISSION_ITEMS.length
  const allGranted = grantedCount === totalCount
  const progressPct = totalCount === 0 ? 0 : Math.round((grantedCount / totalCount) * 100)

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0]" dir="rtl">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#1a2332]">إدارة الصلاحيات</h1>
              </div>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-sm p-1.5 flex flex-wrap gap-1">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center min-w-[100px] ${
                  selectedRole === role
                    ? "bg-[#3453a7] text-white shadow-md"
                    : "text-neutral-500 hover:bg-[#f5f1e8] hover:text-[#3453a7]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 opacity-80" />
                {role}
              </button>
            ))}
            {roles.length === 0 && (
              <p className="text-sm text-neutral-400 p-3">لا توجد مسميات. أضف من صفحة الهيكل الإداري.</p>
            )}
          </div>

          {/* Permissions Panel */}
          {selectedRole && (
            <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-sm overflow-hidden">

              {/* Stats bar */}
              <div className="px-6 pt-5 pb-4 border-b border-[#f0ebe0]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3453a7] to-[#4f73d1] flex items-center justify-center shadow">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a2332] text-base leading-tight">{selectedRole}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{grantedCount} من {totalCount} صلاحية مفعّلة</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleAll}
                    className={`text-xs px-4 py-2 rounded-lg font-semibold border transition-all ${
                      allGranted
                        ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                        : "bg-[#3453a7]/10 border-[#3453a7]/30 text-[#4f73d1] hover:bg-[#3453a7]/20"
                    }`}
                  >
                    {allGranted ? "إلغاء الكل" : "تفعيل الكل"}
                  </button>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-[#4f73d1] to-[#3453a7] rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Toggle list */}
              <div className="divide-y divide-[#f0ebe0]">
                {PERMISSION_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <div className="divide-y divide-[#f0ebe0]">
                      {section.items.map(({ key, icon: Icon }) => {
                        const isExplicitlyGranted = currentPerms.includes(key)
                        const inheritedFrom = !isExplicitlyGranted ? getInheritedPermissionSource(currentPerms, key) : null
                        const granted = hasPermissionAccess(currentPerms, key)

                        return (
                          <div
                            key={key}
                            onClick={() => togglePermission(key)}
                            className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors group ${
                              granted ? "hover:bg-[#3453a7]/10" : "hover:bg-neutral-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                granted
                                  ? "bg-[#3453a7]/15 text-[#4f73d1]"
                                  : "bg-neutral-100 text-neutral-400 group-hover:bg-[#3453a7]/10 group-hover:text-[#3453a7]"
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className={`block text-sm font-medium transition-colors ${
                                  granted ? "text-[#1a2332]" : "text-neutral-500"
                                }`}>{key}</span>
                                {inheritedFrom && (
                                  <span className="text-[11px] text-neutral-400">مفعلة عبر {inheritedFrom}</span>
                                )}
                              </div>
                            </div>

                            <div className={`relative w-12 h-6 rounded-full transition-all duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
                              granted ? "bg-[#3453a7]" : "bg-neutral-200"
                            }`}>
                              <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${
                                granted ? "translate-x-6 scale-100" : "translate-x-0 scale-95"
                              }`} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer save */}
              <div className="px-6 py-4 bg-[#fafaf8] border-t border-[#f0ebe0] flex items-center justify-between">
                <p className="text-xs text-neutral-400">
                  {grantedCount === 0 ? "لا توجد صلاحيات مفعّلة" : `${grantedCount} صلاحية مفعّلة  ${totalCount - grantedCount} موقوفة`}
                </p>
                <button
                  onClick={savePermissions}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-[#4f73d1] to-[#3453a7] hover:opacity-90 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-60 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
