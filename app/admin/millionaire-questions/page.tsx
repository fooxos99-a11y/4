"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { BarChart3, CircleHelp, Edit, Plus, Trash2, Trophy } from "lucide-react"

type Difficulty = "easy" | "medium" | "hard"

type MillionaireQuestion = {
  id: string
  question: string
  option_1: string
  option_2: string
  option_3: string
  option_4: string
  correct_option: number
  difficulty: Difficulty
  created_at: string
}

type FormState = {
  question: string
  option_1: string
  option_2: string
  option_3: string
  option_4: string
  correct_option: string
  difficulty: Difficulty
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
}

const emptyForm: FormState = {
  question: "",
  option_1: "",
  option_2: "",
  option_3: "",
  option_4: "",
  correct_option: "1",
  difficulty: "easy",
}

export default function MillionaireQuestionsAdminPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة من سيربح المليون")

  const [questions, setQuestions] = useState<MillionaireQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<"all" | Difficulty>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<MillionaireQuestion | null>(null)
  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [showDeleteQuestionDialog, setShowDeleteQuestionDialog] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/millionaire-questions")
      const data = await response.json()
      setQuestions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching millionaire questions:", error)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const counts = useMemo(() => {
    return {
      easy: questions.filter((question) => question.difficulty === "easy").length,
      medium: questions.filter((question) => question.difficulty === "medium").length,
      hard: questions.filter((question) => question.difficulty === "hard").length,
    }
  }, [questions])

  const filteredQuestions = useMemo(() => {
    if (selectedDifficulty === "all") {
      return questions
    }

    return questions.filter((question) => question.difficulty === selectedDifficulty)
  }, [questions, selectedDifficulty])

  const openAddDialog = () => {
    setEditingQuestion(null)
    setFormState(emptyForm)
    setSaveError("")
    setDialogOpen(true)
  }

  const openEditDialog = (question: MillionaireQuestion) => {
    setEditingQuestion(question)
    setSaveError("")
    setFormState({
      question: question.question,
      option_1: question.option_1,
      option_2: question.option_2,
      option_3: question.option_3,
      option_4: question.option_4,
      correct_option: String(question.correct_option),
      difficulty: question.difficulty,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (
      !formState.question.trim() ||
      !formState.option_1.trim() ||
      !formState.option_2.trim() ||
      !formState.option_3.trim() ||
      !formState.option_4.trim()
    ) {
      setSaveError("يرجى تعبئة السؤال وجميع الخيارات الأربعة")
      return
    }

    try {
      setSaving(true)
      setSaveError("")
      const payload = {
        ...formState,
        correct_option: Number(formState.correct_option),
      }

      const response = await fetch("/api/millionaire-questions", {
        method: editingQuestion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion ? { id: editingQuestion.id, ...payload } : payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Failed to save question")
      }

      setDialogOpen(false)
      setEditingQuestion(null)
      setFormState(emptyForm)
      await fetchQuestions()
    } catch (error) {
      console.error("Error saving millionaire question:", error)
      setSaveError(error instanceof Error ? error.message : "تعذر حفظ السؤال")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteQuestionId(id)
    setShowDeleteQuestionDialog(true)
  }

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionId) {
      return
    }

    try {
      const response = await fetch(`/api/millionaire-questions?id=${deleteQuestionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete question")
      }

      await fetchQuestions()
    } catch (error) {
      console.error("Error deleting millionaire question:", error)
    } finally {
      setShowDeleteQuestionDialog(false)
      setDeleteQuestionId(null)
    }
  }

  if (authLoading || !authVerified) {
    return <SiteLoader fullScreen />
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-slate-50">
      <Header />

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
                onClick={() => {
                  setShowDeleteQuestionDialog(false)
                  setDeleteQuestionId(null)
                }}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>السؤال</Label>
              <Textarea
                value={formState.question}
                onChange={(event) => setFormState((prev) => ({ ...prev, question: event.target.value }))}
                placeholder="اكتب السؤال هنا"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الخيار الأول</Label>
                <Input value={formState.option_1} onChange={(event) => setFormState((prev) => ({ ...prev, option_1: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>الخيار الثاني</Label>
                <Input value={formState.option_2} onChange={(event) => setFormState((prev) => ({ ...prev, option_2: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>الخيار الثالث</Label>
                <Input value={formState.option_3} onChange={(event) => setFormState((prev) => ({ ...prev, option_3: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>الخيار الرابع</Label>
                <Input value={formState.option_4} onChange={(event) => setFormState((prev) => ({ ...prev, option_4: event.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>درجة الصعوبة</Label>
                <Select value={formState.difficulty} onValueChange={(value: Difficulty) => setFormState((prev) => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الخيار الصحيح</Label>
                <Select value={formState.correct_option} onValueChange={(value) => setFormState((prev) => ({ ...prev, correct_option: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">الخيار الأول</SelectItem>
                    <SelectItem value="2">الخيار الثاني</SelectItem>
                    <SelectItem value="3">الخيار الثالث</SelectItem>
                    <SelectItem value="4">الخيار الرابع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {saveError ? (
              <p className="text-sm font-semibold text-red-600">{saveError}</p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} className="bg-[#3453a7] hover:bg-[#4f73d1] text-white" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : editingQuestion ? "حفظ التعديل" : "إضافة السؤال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">إدارة من سيربح المليون</h1>
              <p className="text-slate-500 mt-2">أضف 5 أسئلة سهلة و5 متوسطة و5 صعبة على الأقل لتعمل اللعبة كاملة.</p>
            </div>
            <Button onClick={openAddDialog} className="bg-[#3453a7] hover:bg-[#4f73d1] text-white rounded-full px-6">
              <Plus className="ml-2 h-5 w-5" />
              إضافة سؤال
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { key: "easy", title: "الأسئلة السهلة", count: counts.easy, color: "from-emerald-500 to-emerald-600" },
              { key: "medium", title: "الأسئلة المتوسطة", count: counts.medium, color: "from-amber-500 to-amber-600" },
              { key: "hard", title: "الأسئلة الصعبة", count: counts.hard, color: "from-rose-500 to-rose-600" },
            ] as const).map((item) => (
              <div key={item.key} className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className={`inline-flex rounded-2xl bg-gradient-to-r ${item.color} p-3 text-white mb-4`}>
                  <Trophy className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">{item.title}</h2>
                <p className="text-3xl font-black text-slate-900 mt-2">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-5 h-5 text-[#3453a7]" />
              <h2 className="font-bold">تصفية الأسئلة</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant={selectedDifficulty === "all" ? "default" : "outline"} className={selectedDifficulty === "all" ? "bg-[#3453a7] hover:bg-[#4f73d1]" : ""} onClick={() => setSelectedDifficulty("all")}>الكل</Button>
              <Button variant={selectedDifficulty === "easy" ? "default" : "outline"} className={selectedDifficulty === "easy" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setSelectedDifficulty("easy")}>سهل</Button>
              <Button variant={selectedDifficulty === "medium" ? "default" : "outline"} className={selectedDifficulty === "medium" ? "bg-amber-600 hover:bg-amber-700" : ""} onClick={() => setSelectedDifficulty("medium")}>متوسط</Button>
              <Button variant={selectedDifficulty === "hard" ? "default" : "outline"} className={selectedDifficulty === "hard" ? "bg-rose-600 hover:bg-rose-700" : ""} onClick={() => setSelectedDifficulty("hard")}>صعب</Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            {loading ? (
              <div className="py-16 flex justify-center">
                <SiteLoader />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                لا توجد أسئلة مطابقة لهذا التصنيف.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((question, index) => {
                  const options = [question.option_1, question.option_2, question.option_3, question.option_4]

                  return (
                    <div key={question.id} className="rounded-3xl border border-slate-200 p-5 hover:border-[#3453a7]/40 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-4 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                              <CircleHelp className="w-4 h-4 text-[#3453a7]" />
                              سؤال {index + 1}
                            </span>
                            <span className="inline-flex rounded-full bg-[#3453a7]/10 px-3 py-1 text-sm font-semibold text-[#b5862c]">
                              {difficultyLabels[question.difficulty]}
                            </span>
                          </div>

                          <p className="text-lg font-bold text-slate-800 leading-8">{question.question}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {options.map((option, optionIndex) => (
                              <div
                                key={`${question.id}-${optionIndex}`}
                                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                                  question.correct_option === optionIndex + 1
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                }`}
                              >
                                {optionIndex + 1}. {option}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 self-start">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(question)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(question.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}