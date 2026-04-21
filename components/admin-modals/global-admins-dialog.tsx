"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Shield, PlusCircle, Trash2, Settings, Plus, Edit2 } from 'lucide-react'
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { normalizeGuardianPhoneForStorage } from "@/lib/phone-number"

interface UserEntry {
  id: string
  name: string
  account_number: number
  role: string
  phone_number?: string
  id_number?: string
}

interface NewAdminForm {
  name: string
  account_number: string
  phone_number: string
  id_number: string
  role: string
}

export function GlobalAdminsDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الهيكل الإداري")
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true)
  const [users, setUsers] = useState<UserEntry[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isAddMode, setIsAddMode] = useState(false)
  const [isAddRoleMode, setIsAddRoleMode] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newAdmin, setNewAdmin] = useState<NewAdminForm>({
    name: "",
    account_number: "",
    phone_number: "",
    id_number: "",
    role: "سكرتير",
  })

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => router.push(window.location.pathname), 300)
    }
  }

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
      const usersRes = await fetch("/api/admin-users", { cache: "no-store" })
      const usersData = await usersRes.json()
      if (!usersRes.ok) throw new Error(usersData.error || "تعذر تحميل الإداريين")
      setUsers((usersData.users || []) as UserEntry[])

      const rolesRes = await fetch("/api/roles")
      const rolesData = await rolesRes.json()
      if (rolesData && rolesData.roles && rolesData.roles.length > 0) {
        const filteredRoles = rolesData.roles.filter((r: string) => r !== "مدير")
        setRoles(filteredRoles)
        setNewAdmin((prev) => ({ ...prev, role: filteredRoles[0] || "سكرتير" }))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ title: "خطأ", description: "تعذر تحميل بيانات الإداريين", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRole = async (roleToDelete: string) => {
    try {
      const rolesRes = await fetch("/api/roles")
      const rolesData = await rolesRes.json()
      const updatedRoles = (rolesData.roles || roles).filter((r: string) => r !== roleToDelete)
      const updatedPermissions = { ...(rolesData.permissions || {}) }
      delete updatedPermissions[roleToDelete]
      const saveRes = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: updatedRoles, permissions: updatedPermissions })
      })
      if (saveRes.ok) {
        toast({ title: "تم الحذف", description: `تم حذف "مسمى ${roleToDelete}"` })
        setRoles(updatedRoles)
      } else {
        throw new Error("Failed")
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف المسمى", variant: "destructive" })
    }
  }

  const RESERVED_ROLE_NAMES = ["طالب", "student", "معلم", "teacher", "نائب معلم", "deputy_teacher", "مدير", "admin"]

  const resetRoleForm = () => {
    setNewRoleName("")
    setEditingRoleName(null)
  }

  const handleStartEditRole = (roleName: string) => {
    setEditingRoleName(roleName)
    setNewRoleName(roleName)
    setIsAddRoleMode(true)
  }

  const handleSaveRole = async () => {
    const trimmedRoleName = newRoleName.trim()

    if (!trimmedRoleName) {
      toast({ title: "تنبيه", description: "الرجاء إدخال المسمى الوظيفي", variant: "destructive" })
      return
    }

    if (RESERVED_ROLE_NAMES.some(r => trimmedRoleName.toLowerCase() === r.toLowerCase())) {
      toast({ title: "مسمى محجوز", description: `"${trimmedRoleName}" اسم محجوز ولا يمكن استخدامه كمسمى وظيفي`, variant: "destructive" })
      return
    }

    if (roles.includes(trimmedRoleName) && trimmedRoleName !== editingRoleName) {
      toast({ title: "تنبيه", description: "المسمى الوظيفي مسجل مسبقاً", variant: "destructive" })
      return
    }

    if (editingRoleName && trimmedRoleName === editingRoleName) {
      resetRoleForm()
      setIsAddRoleMode(false)
      return
    }

    setIsSubmitting(true)
    try {
      if (editingRoleName) {
        const renameRes = await fetch("/api/roles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldRole: editingRoleName, newRole: trimmedRoleName })
        })

        const renameData = await renameRes.json().catch(() => null)
        if (!renameRes.ok) {
          throw new Error(renameData?.error || "Failed to rename role")
        }

        setRoles((currentRoles) => currentRoles.map((role) => role === editingRoleName ? trimmedRoleName : role))
        setUsers((currentUsers) => currentUsers.map((user) => user.role === editingRoleName ? { ...user, role: trimmedRoleName } : user))
        setNewAdmin((prev) => ({ ...prev, role: prev.role === editingRoleName ? trimmedRoleName : prev.role }))
        toast({ title: "تم التعديل", description: `تم تعديل "${editingRoleName}" إلى "${trimmedRoleName}"` })
      } else {
        const rolesRes = await fetch("/api/roles")
        const rolesData = await rolesRes.json()

        const updatedRoles = {
          roles: [...(rolesData.roles || roles), trimmedRoleName],
          permissions: { ...(rolesData.permissions || {}), [trimmedRoleName]: [] }
        }

        const saveRes = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedRoles)
        })

        if (!saveRes.ok) {
          throw new Error("Failed to save")
        }

        toast({ title: "تم الإضافة", description: `تم إضافة "${trimmedRoleName}" بنجاح` })
        setRoles(updatedRoles.roles)
      }

      resetRoleForm()
      setIsAddRoleMode(false)
    } catch {
      toast({ title: "خطأ", description: editingRoleName ? "حدث خطأ أثناء تعديل المسمى" : "حدث خطأ أثناء حفظ المسمى", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.account_number) {
      toast({ title: "تنبيه", description: "يرجى ملء الحقول الإجبارية", variant: "destructive" })
      return
    }

    if (newAdmin.phone_number.trim()) {
      try {
        normalizeGuardianPhoneForStorage(newAdmin.phone_number)
      } catch {
        toast({ title: "خطأ", description: "رقم الجوال غير صالح", variant: "destructive" })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAdmin.name,
          account_number: newAdmin.account_number,
          phone_number: newAdmin.phone_number || null,
          id_number: newAdmin.id_number || null,
          role: newAdmin.role,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "حدث خطأ أثناء الإضافة")

      toast({ title: "نجاح", description: "تم إضافة المستخدم بنجاح" })
      setNewAdmin({ name: "", account_number: "", phone_number: "", id_number: "", role: roles[0] || "سكرتير" })
      setIsAddMode(false)
      fetchData()
    } catch (error) {
      toast({ title: "خطأ", description: error instanceof Error ? error.message : "حدث خطأ أثناء الإضافة", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin-users?id=${userId}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "فشل في حذف المستخدم")
      toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" })
      setUsers(users.filter(u => u.id !== userId))
    } catch {
      toast({ title: "خطأ", description: "فشل في حذف المستخدم", variant: "destructive" })
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "فشل في تحديث المسمى الوظيفي")

      toast({ title: "نجاح", description: "تم تحديث المسمى الوظيفي بنجاح" })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديث المسمى الوظيفي", variant: "destructive" })
    }
  }

  if (isLoading || authLoading || !authVerified) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="relative px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="text-center text-lg font-bold text-[#1a2332] md:text-xl">
              <Settings className="absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
              <span>الهيكل الإداري</span>
            </DialogTitle>

            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7] bg-[#3453a7] hover:bg-[#28448e] text-white hover:text-white text-sm font-semibold shadow-none"
                    aria-label="خيارات الإضافة"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[170px] rounded-xl border border-[#3453a7]/20 p-1.5" dir="rtl">
                  <DropdownMenuItem
                    onClick={() => setIsAddMode(true)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة إداري</span>
                    <UserPlus className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsAddRoleMode(true)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[#1a2332] focus:bg-[#3453a7]/10"
                  >
                    <span>إضافة مسمى</span>
                    <PlusCircle className="w-4 h-4 text-[#3453a7]" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">

          {/* Dialog: Add Role */}
          <Dialog open={isAddRoleMode} onOpenChange={(open) => {
            setIsAddRoleMode(open)
            if (!open) {
              resetRoleForm()
            }
          }}>
            <DialogContent className="sm:max-w-md bg-white border-[#3453a7]/20 font-cairo" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a2332]">{editingRoleName ? "تعديل المسمى الوظيفي" : "إضافة مسمى وظيفي جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>اسم المسمى الوظيفي</Label>
                  <Input
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveRole() }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <p className="text-xs text-neutral-500 w-full">المسميات الحالية:</p>
                  {roles.map(r => (
                    <span key={r} className="text-xs bg-[#3453a7]/10 text-[#4f73d1] border border-[#3453a7]/30 rounded-full pl-3 pr-2 py-1 flex items-center gap-1">
                      {r}
                      <button
                        onClick={() => handleStartEditRole(r)}
                        className="w-4 h-4 rounded-full bg-[#3453a7]/20 hover:bg-[#3453a7]/30 flex items-center justify-center text-[#4f73d1] transition-colors"
                        title="تعديل المسمى"
                      ><Edit2 className="h-2.5 w-2.5" /></button>
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="w-4 h-4 rounded-full bg-[#3453a7]/20 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-[#4f73d1] transition-colors text-[10px] font-bold leading-none"
                        title="حذف المسمى"
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  resetRoleForm()
                  setIsAddRoleMode(false)
                }}>إلغاء</Button>
                <Button onClick={handleSaveRole} disabled={isSubmitting} className="relative h-10 min-w-[140px] bg-[#3453a7] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">
                  <span className={isSubmitting ? "invisible" : ""}>{editingRoleName ? "حفظ التعديل" : "حفظ المسمى"}</span>
                  {isSubmitting ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <SiteLoader size="sm" color="#f8f4ea" />
                    </span>
                  ) : null}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog: Add User */}
          <Dialog open={isAddMode} onOpenChange={setIsAddMode}>
            <DialogContent className="sm:max-w-md bg-white border-[#3453a7]/20 font-cairo" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a2332]">إضافة اداري جديد</DialogTitle>
                <DialogDescription>أدخل بيانات الإداري والمسمى الوظيفي</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>رقم الحساب *</Label>
                  <Input type="number" value={newAdmin.account_number} onChange={e => setNewAdmin({ ...newAdmin, account_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>المسمى الوظيفي *</Label>
                  <Select value={newAdmin.role} onValueChange={(val) => setNewAdmin({ ...newAdmin, role: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المسمى" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {roles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input value={newAdmin.phone_number} onChange={e => setNewAdmin({ ...newAdmin, phone_number: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input value={newAdmin.id_number} onChange={e => setNewAdmin({ ...newAdmin, id_number: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddMode(false)}>إلغاء</Button>
                <Button onClick={handleAddAdmin} disabled={isSubmitting} className="relative h-10 min-w-[140px] bg-[#3453a7] text-white border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100">
                  <span className={isSubmitting ? "invisible" : ""}>حفظ</span>
                  {isSubmitting ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <SiteLoader size="sm" color="#f8f4ea" />
                    </span>
                  ) : null}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Users List */}
          {users.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm p-16 text-center">
              <Shield className="w-10 h-10 text-[#3453a7] mx-auto mb-4" />
              <p className="text-lg font-semibold text-neutral-500">لا يوجد مستخدمين لعرضهم</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#3453a7]/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#3453a7]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">قائمة الإداريين</h2>
              </div>
              <div className="divide-y divide-[#3453a7]/20">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 hover:bg-[#3453a7]/5 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-[#3453a7]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2332]">{user.name}</p>
                        <p className="text-xs text-neutral-500">حساب رقم: {user.account_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-[160px]">
                        <Select value={user.role} onValueChange={(val) => handleChangeRole(user.id, val)}>
                          <SelectTrigger className="h-9 border-[#3453a7]/30 text-sm w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {roles.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {user.account_number !== 2 && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
