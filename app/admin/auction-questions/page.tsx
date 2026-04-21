"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Edit, 
  Trash2, 
  LayoutGrid, 
  HelpCircle, 
  CheckCircle2, 
  FolderPlus,
  MessageSquarePlus,
  ArrowLeftRight
} from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Category = {
  id: string
  name: string
}

type Question = {
  id: string
  category_id: string
  category: {
    id: string
    name: string
  }
  question: string
  answer: string
}

export default function AuctionQuestionsAdmin() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة أسئلة المزاد");

  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [newQuestion, setNewQuestion] = useState({ category_id: "", question: "", answer: "" })
  const [newCategoryName, setNewCategoryName] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDeleteQuestionDialog, setShowDeleteQuestionDialog] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestions()
    fetchCategories()
  }, [])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/auction-questions")
      const data = await response.json()
      setQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/auction-categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.category_id || !newQuestion.question.trim() || !newQuestion.answer.trim()) return
    try {
      const response = await fetch("/api/auction-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      })
      if (response.ok) {
        setNewQuestion({ category_id: "", question: "", answer: "" })
        setIsAddDialogOpen(false)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error adding question:", error)
    }
  }

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return
    try {
      const response = await fetch("/api/auction-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion),
      })
      if (response.ok) {
        setEditingQuestion(null)
        setIsEditDialogOpen(false)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error updating question:", error)
    }
  }

  const handleDeleteQuestion = (id: string) => {
    setDeleteQuestionId(id)
    setShowDeleteQuestionDialog(true)
  }

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionId) return
    try {
      const response = await fetch(`/api/auction-questions?id=${deleteQuestionId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error deleting question:", error)
    } finally {
      setShowDeleteQuestionDialog(false)
      setDeleteQuestionId(null)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const response = await fetch("/api/auction-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      })
      if (response.ok) {
        setNewCategoryName("")
        setIsAddCategoryDialogOpen(false)
        fetchCategories()
      }
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!id || !confirm("هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الأسئلة المرتبطة بها.")) return
    try {
      const response = await fetch(`/api/auction-categories?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchCategories()
        fetchQuestions()
        setSelectedCategoryId("all")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  if (authLoading || !authVerified) return <SiteLoader fullScreen />

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* نافذة تأكيد حذف السؤال */}
      <Dialog open={showDeleteQuestionDialog} onOpenChange={setShowDeleteQuestionDialog}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl">
          <div className="p-2 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-500 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">تأكيد حذف السؤال</h2>
            <p className="text-slate-500 mb-6">هل أنت متأكد من حذف هذا السؤال نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteQuestionDialog(false); setDeleteQuestionId(null); }}
                className="px-6 rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                onClick={confirmDeleteQuestion}
                className="px-6 bg-red-500 hover:bg-red-600 text-white rounded-xl"
              >
                حذف الآن
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          
          {/* رأس الصفحة */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                إدارة أسئلة المزاد
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setIsAddCategoryDialogOpen(true)}
                variant="outline"
                className="border-[#3453a7] text-[#3453a7] hover:bg-[#3453a7]/5 rounded-full px-6"
              >
                <FolderPlus className="ml-2 w-5 h-5" /> إضافة فئة
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#3453a7] hover:bg-[#4f73d1] text-white shadow-md rounded-full px-6"
              >
                <MessageSquarePlus className="ml-2 w-5 h-5" /> إضافة سؤال جديد
              </Button>
            </div>
          </div>

          {/* قسم تصفية الفئات (Tabs style) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="text-[#3453a7] w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-800">الفئات</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={`px-5 py-2 rounded-full font-medium text-sm transition-all border ${
                  selectedCategoryId === "all"
                    ? 'bg-[#3453a7] border-[#3453a7] text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#3453a7] hover:text-[#3453a7]'
                }`}
              >
                الكل
              </button>
              {categories.map((category) => (
                <div key={category.id} className="relative group">
                  <button
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-5 py-2 rounded-full font-medium text-sm transition-all border ${
                      selectedCategoryId === category.id
                        ? 'bg-[#3453a7] border-[#3453a7] text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-[#3453a7] hover:text-[#3453a7]'
                    }`}
                  >
                    {category.name}
                  </button>
                  {selectedCategoryId === category.id && (
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="absolute -top-2 -left-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* قائمة الأسئلة */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><SiteLoader /></div>
            ) : (
              <>
                {questions
                  .filter((q) => selectedCategoryId === "all" ? true : q.category_id === selectedCategoryId)
                  .map((question) => (
                    <div
                      key={question.id}
                      className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md hover:border-[#3453a7]/40"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="inline-flex items-center px-3 py-1 bg-amber-50 text-[#3453a7] text-xs font-bold rounded-lg border border-amber-100">
                            {question.category.name}
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                            <p className="text-lg font-semibold text-slate-800 leading-relaxed">
                              {question.question}
                            </p>
                          </div>
                          
                          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <CheckCircle2 className="w-5 h-5 text-[#3453a7] mt-0.5 shrink-0" />
                            <p className="text-slate-600">
                              <span className="font-bold text-slate-800 ml-1">الإجابة:</span> {question.answer}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => {
                              setEditingQuestion(question)
                              setIsEditDialogOpen(true)
                            }}
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-[#3453a7] hover:bg-amber-50 rounded-full"
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuestion(question.id)}
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                {questions.filter((q) => selectedCategoryId === "all" ? true : q.category_id === selectedCategoryId).length === 0 && (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-xl text-slate-500 font-medium">لا توجد أسئلة مضافة في هذه الفئة</p>
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)}
                      variant="link" 
                      className="text-[#3453a7] mt-2 font-bold"
                    >
                      أضف أول سؤال الآن
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* مودالات (إضافة/تعديل فئة وسؤال) */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageSquarePlus className="text-[#3453a7]" /> إضافة سؤال جديد
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold">الفئة</Label>
              <Select
                value={newQuestion.category_id}
                onValueChange={(v) => setNewQuestion({ ...newQuestion, category_id: v })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                  <SelectValue placeholder="اختر الفئة المستهدفة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">السؤال</Label>
              <Input
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                placeholder="اكتب نص السؤال هنا..."
                className="h-12 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">الإجابة</Label>
              <Input
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                placeholder="الإجابة الصحيحة"
                className="h-12 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleAddQuestion} 
                className="flex-1 h-12 rounded-xl bg-[#3453a7] hover:bg-[#4f73d1] text-white"
                disabled={!newQuestion.category_id || !newQuestion.question.trim()}
              >
                حفظ السؤال
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-12 rounded-xl px-6">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="rounded-2xl border-0 shadow-2xl p-0 overflow-hidden max-w-sm">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="text-[#3453a7]" /> إضافة فئة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">اسم الفئة</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثال: معلومات عامة"
                className="h-12 rounded-xl bg-slate-50"
              />
            </div>
            <Button 
              onClick={handleAddCategory} 
              className="w-full h-12 rounded-xl bg-[#3453a7] hover:bg-[#4f73d1] text-white"
              disabled={!newCategoryName.trim()}
            >
              إضافة الفئة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال التعديل (نفس تصميم الإضافة) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Edit className="text-[#3453a7]" /> تعديل السؤال
            </DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold">الفئة</Label>
                <Select
                  value={editingQuestion.category_id}
                  onValueChange={(v) => setEditingQuestion({ ...editingQuestion, category_id: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">السؤال</Label>
                <Input
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">الإجابة</Label>
                <Input
                  value={editingQuestion.answer}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value })}
                  className="h-12 rounded-xl bg-slate-50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleUpdateQuestion} className="flex-1 h-12 rounded-xl bg-[#3453a7] hover:bg-[#4f73d1] text-white">
                  تحديث التغييرات
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-12 rounded-xl px-6">
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}

function X({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}