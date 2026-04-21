"use client"

import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { SiteLoader } from "@/components/ui/site-loader"
import { Bell, Send, CheckSquare, Square, Users, GraduationCap, ShieldCheck, Search, Loader2 } from "lucide-react"
import { getOfflineErrorMessage } from "@/lib/network-error"

interface User {
  id: string
  name: string
  account_number: string
  role: string
  halaqah: string | null
}

export default function AdminNotificationsClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const [targetType, setTargetType] = useState<"teachers" | "students" | "admins" | "all">("students")
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>("all")
  const [halaqat, setHalaqat] = useState<string[]>([])
  
  const [searchQuery, setSearchQuery] = useState("")
  
  // Individual inputs instead of a single one as requested: "وجنب كل معلم مكتوب فراغ اكتب فيه الإشعار"
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({})
  const [userMessages, setUserMessages] = useState<Record<string, string>>({})
  const [globalMessage, setGlobalMessage] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      const [adminsResponse, teachersResponse, studentsResponse] = await Promise.all([
        fetch("/api/admin-users", { cache: "no-store" }),
        fetch("/api/teachers", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ])

      const [adminsPayload, teachersPayload, studentsPayload] = await Promise.all([
        adminsResponse.json(),
        teachersResponse.json(),
        studentsResponse.json(),
      ])

      if (!adminsResponse.ok || !teachersResponse.ok || !studentsResponse.ok) {
        throw new Error(
          adminsPayload?.error || teachersPayload?.error || studentsPayload?.error || "تعذر تحميل المستخدمين",
        )
      }

      const adminUsers = Array.isArray(adminsPayload.users) ? adminsPayload.users : []
      const teacherUsers = Array.isArray(teachersPayload.teachers) ? teachersPayload.teachers : []
      const formattedStudents = (Array.isArray(studentsPayload.students) ? studentsPayload.students : []).map(s => ({
        ...s,
        role: "student",
      }))

      const allCombinedUsers = [...adminUsers, ...teacherUsers, ...formattedStudents]
      setUsers(allCombinedUsers)
      
      const uniqueHalaqat = Array.from(new Set(allCombinedUsers.filter(u => u.role === "student" && u.halaqah).map(u => u.halaqah))).filter(Boolean) as string[]
      // Sort dynamically for better display (1, 2, 3...)
      uniqueHalaqat.sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
      setHalaqat(uniqueHalaqat)
    } catch (e) {
      console.error(e)
      toast({ title: "حدث خطأ في جلب المستخدمين", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (targetType === "teachers" && user.role !== "teacher" && user.role !== "deputy_teacher") return false
    if (targetType === "admins" && (user.role === "student" || user.role === "teacher" || user.role === "deputy_teacher")) return false
    if (targetType === "students") {
      if (user.role !== "student") return false
      if (selectedHalaqah !== "all" && user.halaqah !== selectedHalaqah) return false
    }
    
    if (searchQuery) {
      return user.name.includes(searchQuery) || String(user.account_number).includes(searchQuery)
    }
            return true
  })

  // Group selection
  const selectAll = () => {
    const newSelected = { ...selectedUsers }
    filteredUsers.forEach(u => newSelected[u.account_number] = true)
    setSelectedUsers(newSelected)
  }

  const deselectAll = () => {
    const newSelected = { ...selectedUsers }
    filteredUsers.forEach(u => delete newSelected[u.account_number])
    setSelectedUsers(newSelected)
  }

  const areAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUsers[u.account_number])

  const handleMessageChange = (accountNumber: string, value: string) => {
    setUserMessages(prev => ({ ...prev, [accountNumber]: value }))
    if (value && !selectedUsers[accountNumber]) {
      setSelectedUsers(prev => ({ ...prev, [accountNumber]: true }))
    }
  }

  const handleGlobalMessageChange = (value: string) => {
    setGlobalMessage(value)
    // Apply this message to all selected users
    if (value) {
      const newMessages = { ...userMessages }
      Object.keys(selectedUsers).forEach(acc => {
        if (selectedUsers[acc]) {
          newMessages[acc] = value
        }
      })
      setUserMessages(newMessages)
    }
  }

  const handleSend = async () => {
    const notificationsToSend = []
    
    for (const [acc, isSelected] of Object.entries(selectedUsers)) {
      if (isSelected) {
        const msg = userMessages[acc] || globalMessage
        if (msg.trim()) {
          notificationsToSend.push({
            user_account_number: acc,
            message: msg.trim()
          })
        }
      }
    }

    if (notificationsToSend.length === 0) {
      toast({ title: "يرجى تحديد مستخدم واحد على الأقل وكتابة الإشعار", variant: "destructive" })
      return
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast({
        title: "لا يوجد اتصال بالإنترنت",
        description: "تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: notificationsToSend }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "حدث خطأ أثناء الإرسال")
      }

      toast({ title: "تم إرسال الإشعارات بنجاح!", variant: "default" })
      
      // Clear after success
      setSelectedUsers({})
      setUserMessages({})
      setGlobalMessage("")
      
    } catch (e: any) {
      console.error(e)
      const offlineMessage = getOfflineErrorMessage(e)
      toast({
        title: offlineMessage || e.message || "حدث خطأ أثناء الإرسال",
        description: offlineMessage ? "تحقق من اتصالك بالإنترنت ثم أعد المحاولة." : undefined,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#3453a7]/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#3453a7]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a2332]">الإشعارات</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <button 
                onClick={() => setTargetType("students")}
                className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all ${targetType === "students" ? 'border-[#3453a7] bg-[#3453a7]/5 text-[#1a2332]' : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <GraduationCap className="w-6 h-6" />
                <span className="font-bold">الطلاب</span>
              </button>
              <button 
                onClick={() => setTargetType("teachers")}
                className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all ${targetType === "teachers" ? 'border-[#3453a7] bg-[#3453a7]/5 text-[#1a2332]' : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <Users className="w-6 h-6" />
                <span className="font-bold">المعلمين</span>
              </button>
              <button 
                onClick={() => setTargetType("admins")}
                className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all ${targetType === "admins" ? 'border-[#3453a7] bg-[#3453a7]/5 text-[#1a2332]' : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <ShieldCheck className="w-6 h-6" />
                <span className="font-bold">الإداريين</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            {targetType === "students" && (
              <select
                value={selectedHalaqah}
                onChange={(e) => setSelectedHalaqah(e.target.value)}
                className="w-full md:w-64 h-12 px-4 rounded-xl border border-gray-300 focus:border-[#3453a7] focus:ring-1 focus:ring-[#3453a7] outline-none"
              >
                <option value="all">جميع الحلقات ({users.filter(u => u.role === "student").length} طالب)</option>
                {halaqat.map(h => (
                  <option key={h} value={h}>
                    حلقة {h} ({users.filter(u => u.role === "student" && u.halaqah === h).length} طالب)
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute right-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الحساب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-300 focus:border-[#3453a7] focus:ring-1 focus:ring-[#3453a7] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center gap-4 bg-white justify-between">
          <button
            onClick={areAllSelected ? deselectAll : selectAll}
            className="flex items-center gap-2 px-4 py-2 text-[#1a2332] font-bold rounded-lg hover:bg-gray-50"
          >
            {areAllSelected ? <CheckSquare className="w-5 h-5 text-[#3453a7]" /> : <Square className="w-5 h-5 text-gray-400" />}
            <span>تحديد الكل ({filteredUsers.length})</span>
          </button>

          <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="إشعار موحد للمحددين..."
              value={globalMessage}
              onChange={(e) => handleGlobalMessageChange(e.target.value)}
              className="flex-1 h-10 px-4 rounded-lg border border-[#3453a7]/30 focus:border-[#3453a7] outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || Object.keys(selectedUsers).length === 0}
              className="relative h-10 min-w-[116px] px-6 bg-[#3453a7] hover:bg-[#4f73d1] text-white font-bold rounded-lg inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {!sending ? <span className="hidden sm:inline">إرسال</span> : null}
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="max-h-[600px] overflow-y-auto p-4 bg-gray-50/20">
          {loading ? (
            <div className="flex justify-center py-12"><SiteLoader /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">لا يوجد مستخدمين لعرضهم</div>
          ) : (
            <div className="grid gap-3">
              {filteredUsers.map((user) => (
                <div key={user.account_number} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-[#3453a7]/30 transition-colors">
                  
                  <div className="flex items-center gap-3 min-w-[250px]">
                    <button 
                      onClick={() => {
                        const isSelected = !selectedUsers[user.account_number];
                        setSelectedUsers(prev => {
                          const next = { ...prev };
                          if (isSelected) next[user.account_number] = true;
                          else delete next[user.account_number];
                          return next;
                        });
                      }}
                      className="flex-shrink-0"
                    >
                      {selectedUsers[user.account_number] ? 
                        <CheckSquare className="w-6 h-6 text-[#3453a7]" /> : 
                        <Square className="w-6 h-6 text-gray-300" />
                      }
                    </button>
                    <div>
                      <div className="font-bold text-[#1a2332]">{user.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <span>{user.account_number}</span>
                        {user.halaqah && (
                           <>
                           <span>•</span>
                           <span className="bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded text-[10px] font-bold">
                             {user.halaqah}
                           </span>
                           </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full relative">
                    <input
                      type="text"
                      placeholder="اكتب إشعاراً مخصصاً لهذا المستخدم..."
                      value={userMessages[user.account_number] || ""}
                      onChange={(e) => handleMessageChange(user.account_number, e.target.value)}
                      className="w-full h-12 px-4 rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-[#3453a7]/50 focus:ring-0 outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
