"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { 
  Plus, 
  Trash2, 
  Upload, 
  ImageIcon, 
  X, 
  Pencil, 
  CircleAlert,
  FolderPlus,
  ImagePlus
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type GuessImage = {
  id: string;
  image_url: string;
  answer: string;
  hint: string | null;
  active: boolean;
  stage_id?: number;
}

type Stage = {
  id: number
  name: string
}

export default function GuessImagesManagement() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة صور خمن الصورة");
  const router = useRouter();
  
  const [images, setImages] = useState<GuessImage[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<GuessImage | null>(null)
  
  const [formData, setFormData] = useState({
    image_url: "",
    answer: ""
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  // مراحل خمن الصورة
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStage, setNewStage] = useState("")
  const [stageLoading, setStageLoading] = useState(false)

  const fetchStages = async () => {
    setStageLoading(true)
    try {
      const response = await fetch("/api/guess-image-stages")
      const data = await response.json()
      setStages(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0 && !selectedStageId) {
        setSelectedStageId(data[0].id)
      }
    } catch (error) {
      setStages([])
    } finally {
      setStageLoading(false)
    }
  }

  const addStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStage.trim()) return
    setStageLoading(true)
    try {
      const res = await fetch("/api/guess-image-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStage })
      })
      if (res.ok) {
        setNewStage("")
        setShowAddStage(false)
        await fetchStages()
      }
    } catch (error) {
      console.error("Error adding stage:", error)
    } finally {
      setStageLoading(false)
    }
  }

  const deleteStage = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة وجميع صورها؟")) return
    setStageLoading(true)
    try {
      await fetch(`/api/guess-image-stages?id=${id}`, { method: "DELETE" })
      if (selectedStageId === id) setSelectedStageId(null)
      await fetchStages()
    } catch (error) {
      console.error("Error deleting stage:", error)
    } finally {
      setStageLoading(false)
    }
  }

  useEffect(() => {
    fetchStages()
  }, [])

  useEffect(() => {
    if (selectedStageId !== null) {
      fetchImages(selectedStageId)
    } else {
      setImages([])
      setLoading(false)
    }
  }, [selectedStageId])

  const fetchImages = async (stageId?: number) => {
    setLoading(true)
    try {
      let url = "/api/guess-images"
      if (stageId) url += `?stage_id=${stageId}`
      const response = await fetch(url)
      const data = await response.json()
      setImages(Array.isArray(data) ? data : [])
    } catch (error) {
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formDataUpload
    })
    
    if (!response.ok) {
      throw new Error('فشل رفع الصورة')
    }
    const data = await response.json()
    return data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let imageUrl = formData.image_url

      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile)
      }
      const dataToSend = {
        image_url: imageUrl,
        answer: formData.answer,
        hint: null,
        stage_id: selectedStageId
      }

      const method = editingImage ? "PUT" : "POST"
      const bodyParams = editingImage 
        ? JSON.stringify({ id: editingImage.id, ...dataToSend })
        : JSON.stringify(dataToSend)

      const response = await fetch("/api/guess-images", {
        method,
        headers: { "Content-Type": "application/json" },
        body: bodyParams
      })

      if (response.ok) {
        await fetchImages(selectedStageId!)
        handleCloseDialog()
      }
    } catch (error) {
      console.error("Error saving image:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return
    try {
      const response = await fetch(`/api/guess-images?id=${id}`, {
        method: "DELETE"
      })
      if (response.ok) {
        await fetchImages(selectedStageId!)
      }
    } catch (error) {
      console.error("Error deleting image:", error)
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type.startsWith('image/')) {
      handleFileSelect(files[0])
    }
  }

  const handleEdit = (image: GuessImage) => {
    setEditingImage(image)
    setFormData({ image_url: image.image_url, answer: image.answer })
    setPreviewUrl(image.image_url)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingImage(null)
    setFormData({ image_url: "", answer: "" })
    setSelectedFile(null)
    setPreviewUrl("")
    setUploading(false)
  }

  if (authLoading || !authVerified) return <SiteLoader fullScreen />

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-7xl space-y-8">
          
          {/* رأس الصفحة */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                إدارة لعبة خمن الصورة
              </h1>
            </div>
            <Button
              onClick={() => {
                setEditingImage(null);
                setFormData({ image_url: "", answer: "" });
                setPreviewUrl("");
                setSelectedFile(null);
                setDialogOpen(true);
              }}
              disabled={!selectedStageId}
              size="lg"
              className="bg-[#3453a7] hover:bg-[#4f73d1] text-white shadow-md transition-all rounded-full px-6"
            >
              <ImagePlus className="ml-2 w-5 h-5" /> إضافة صورة جديدة
            </Button>
          </div>

          {/* قسم المراحل */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FolderPlus className="text-[#3453a7] w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-800">المستويات</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {stageLoading && stages.length === 0 ? (
                <div className="py-2"><SiteLoader /></div>
              ) : (
                <>
                  {stages.map(stage => (
                    <div 
                      key={stage.id} 
                      className={`group relative flex items-center transition-all rounded-full border ${
                        selectedStageId === stage.id 
                          ? 'bg-[#3453a7] border-[#3453a7] text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#3453a7] hover:text-[#3453a7]'
                      }`}
                    >
                      <button
                        className="px-5 py-2 font-medium text-sm outline-none"
                        onClick={() => setSelectedStageId(stage.id)}
                      >
                        {stage.name}
                      </button>
                      <button 
                        onClick={() => deleteStage(stage.id)} 
                        title="حذف المرحلة" 
                        className={`p-2 rounded-full transition-colors ${
                          selectedStageId === stage.id ? 'hover:bg-white/20' : 'hover:bg-red-50 hover:text-red-500'
                        }`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {!showAddStage ? (
                    <Button 
                      variant="outline" 
                      className="rounded-full border-dashed border-2 hover:border-[#3453a7] hover:text-[#3453a7] hover:bg-[#3453a7]/5"
                      onClick={() => setShowAddStage(true)}
                    >
                      <Plus className="w-4 h-4 ml-1" /> إضافة مستوى
                    </Button>
                  ) : (
                    <form onSubmit={addStage} className="flex items-center gap-2 bg-slate-50 p-1 rounded-full border border-slate-200">
                      <Input 
                        value={newStage} 
                        onChange={e => setNewStage(e.target.value)} 
                        placeholder="اسم المستوى..." 
                        className="border-0 bg-transparent focus-visible:ring-0 w-40 rounded-full"
                        autoFocus
                      />
                      <Button type="submit" size="sm" className="rounded-full bg-[#3453a7] hover:bg-[#4f73d1] text-white" disabled={stageLoading || !newStage.trim()}>
                        حفظ
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="rounded-full text-slate-500 hover:text-red-500" onClick={() => setShowAddStage(false)}>
                        <X size={16} />
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          {/* قسم عرض الصور */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
            {selectedStageId ? (
              loading ? (
                <div className="flex justify-center items-center h-64"><SiteLoader /></div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-800">لا توجد صور هنا</h3>
                    <p className="text-slate-500 text-sm mt-1">ابدأ بإضافة صور جديدة لهذا المستوى</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[#3453a7]/50"
                    >
                      {/* حاوية الصورة مع أزرار التحكم الطافية */}
                      <div className="relative aspect-square bg-slate-100 overflow-hidden">
                        <img
                          src={image.image_url}
                          alt={image.answer}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* تدرج لوني ليظهر عند التمرير لتوضيح الأزرار */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* أزرار التحكم تظهر عند تمرير الماوس */}
                        <div className="absolute top-3 left-3 right-3 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-[-10px] group-hover:translate-y-0">
                          <div className="flex gap-2">
                            <button
                              title="تعديل"
                              onClick={() => handleEdit(image)}
                              className="bg-white/90 text-slate-700 hover:text-[#3453a7] hover:bg-white rounded-full p-2 shadow-sm transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                          <button
                            title="حذف"
                            onClick={() => handleDelete(image.id)}
                            className="bg-white/90 text-red-500 hover:text-white hover:bg-red-500 rounded-full p-2 shadow-sm transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* تفاصيل الصورة */}
                      <div className="p-4 bg-white border-t border-slate-100">
                        <h3 className="font-bold text-slate-800 truncate text-center" title={image.answer}>
                          {image.answer}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FolderPlus className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-xl text-slate-500 font-medium">الرجاء اختيار مستوى من الأعلى لعرض المحتوى</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* نافذة الإضافة/التعديل (Modal) */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {editingImage ? <Pencil className="w-6 h-6 text-[#3453a7]" /> : <ImagePlus className="w-6 h-6 text-[#3453a7]" />}
              {editingImage ? "تعديل تفاصيل الصورة" : "رفع صورة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
            {/* منطقة السحب والإفلات */}
            <div className="space-y-2">
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#3453a7] shadow-sm">
                    <CircleAlert className="h-3.5 w-3.5" />
                  </span>
                  <div className="leading-6">
                    يفضل رفع الصور على مقاس (1920x840)
                  </div>
                </div>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? 'border-[#3453a7] bg-amber-50/50'
                    : 'border-slate-300 bg-slate-50 hover:border-[#3453a7] hover:bg-slate-50/80'
                }`}
              >
                {previewUrl ? (
                  <div className="space-y-4 relative z-10">
                    <img
                      src={previewUrl}
                      alt="معاينة"
                      className="max-h-56 mx-auto rounded-lg shadow-sm object-contain"
                    />
                    <div className="inline-flex items-center gap-2 text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm group-hover:bg-[#3453a7] group-hover:text-white transition-colors">
                      <Upload className="w-4 h-4" /> اضغط لتغيير الصورة
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-6">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-[#3453a7]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-700">
                        اسحب وأفلت الصورة هنا
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        أو اضغط لاختيار ملف (PNG, JPG, WEBP)
                      </p>
                    </div>
                  </div>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer" className="text-sm font-semibold text-slate-700">الإجابة الصحيحة <span className="text-red-500">*</span></Label>
              <Input
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="مثال: برج إيفل، سيارة، تفاحة..."
                required
                className="h-12 text-lg px-4 bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={uploading || (!selectedFile && !editingImage) || !selectedStageId}
                className="flex-1 h-12 text-base font-semibold bg-[#3453a7] hover:bg-[#4f73d1] text-white rounded-xl disabled:opacity-50"
              >
                {uploading ? "جاري الحفظ..." : editingImage ? "حفظ التعديلات" : "إضافة الصورة للمستوى"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="h-12 px-8 text-base font-medium rounded-xl hover:bg-slate-100"
                disabled={uploading}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}