"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { ShoppingBag, Tag, Package, Plus, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function StoreManagementPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المتجر");

  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  function showConfirm(msg: string, cb: () => void) {
    setConfirmMessage(msg);
    setConfirmCallback(() => cb);
    setConfirmOpen(true);
  }
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const supabase = getSupabase();
    const { data: productsData } = await supabase.from("store_products").select("*").order('created_at', { ascending: false });
    const { data: categoriesData } = await supabase.from("store_categories").select("*");
    setProducts(productsData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  }

  async function handleAddProduct(e: any) {
    e.preventDefault();
    if (!name || !price || !selectedCategoryId) {
      alert("يرجى تعبئة جميع الحقول واختيار الفئة");
      return;
    }
    setLoading(true);
    let imageUrl = null;
    try {
      if (imageFile) {
        const supabase = getSupabase();
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from("store-products").upload(fileName, imageFile);
        if (error) {
          alert("فشل رفع الصورة: " + error.message);
          setLoading(false);
          return;
        }
        imageUrl = supabase.storage.from("store-products").getPublicUrl(fileName).data.publicUrl;
      }
      const supabase = getSupabase();
      const { error: insertError } = await supabase.from("store_products").insert({
          name,
          price: Number(price),
          category_id: selectedCategoryId,
          image_url: imageUrl,
        });
      if (insertError) {
        alert("فشل إضافة المنتج: " + insertError.message);
        setLoading(false);
        return;
      }
      alert("تمت إضافة المنتج بنجاح");
      setName("");
      setPrice("");
      setSelectedCategoryId("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchData();
    } catch (err) {
      alert("حدث خطأ غير متوقع");
    }
    setLoading(false);
  }

  async function handleAddCategory(e: any) {
    e.preventDefault();
    if (!newCategory) return;
    setLoading(true);
    const supabase = getSupabase();
    await supabase.from("store_categories").insert({ name: newCategory });
    setNewCategory("");
    fetchData();
  }

  async function handleDeleteProduct(id: string) {
    showConfirm("هل أنت متأكد من حذف هذا المنتج؟", async () => {
      setLoading(true);
      const supabase = getSupabase();
      await supabase.from("store_products").delete().eq("id", id);
      fetchData();
    });
  }

  async function handleDeleteCategory(id: string) {
    const category = categories.find(c => c.id === id);
    if (category?.name === "المظاهر") {
      alert("لا يمكن حذف فئة المظاهر الأساسية");
      return;
    }
    showConfirm("سيتم حذف الفئة وكل المنتجات المرتبطة بها. هل أنت متأكد؟", async () => {
      setLoading(true);
      const supabase = getSupabase();
      await supabase.from("store_categories").delete().eq("id", id);
      fetchData();
    });
  }

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">

          {/* Page Header */}
          <div className="flex items-center justify-between border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-[#3453a7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">إدارة المتجر</h1>
            </div>
            <button
              onClick={() => router.push("/admin/store-orders")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-semibold transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              طلبات الطلاب
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Forms */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* Categories Card */}
              <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#3453a7]/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-[#3453a7]" />
                  </div>
                  <h3 className="font-bold text-[#1a2332]">الفئات</h3>
                </div>
                <div className="p-5">
                  <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                    <Input
                      placeholder="اسم فئة جديدة..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="border-[#3453a7]/30 focus-visible:ring-[#3453a7]/30"
                    />
                    <button
                      type="submit"
                      disabled={loading || !newCategory}
                      className="w-10 h-10 rounded-lg border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(cat => cat.name !== "المظاهر").length === 0 ? (
                      <p className="text-xs text-neutral-400 w-full text-center py-2">لا توجد فئات إضافية</p>
                    ) : (
                      categories.filter(cat => cat.name !== "المظاهر").map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 bg-[#3453a7]/8 text-[#4f73d1] px-3 py-1.5 rounded-lg text-sm font-medium border border-[#3453a7]/25">
                          <span>{cat.name}</span>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-[#3453a7]/50 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Add Product Card */}
              <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#3453a7]/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#3453a7]" />
                  </div>
                  <h3 className="font-bold text-[#1a2332]">منتج جديد</h3>
                </div>
                <div className="p-5">
                  <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                    {/* Image Upload */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#3453a7]/30 bg-[#fafaf9] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#3453a7]/60 hover:bg-[#3453a7]/5 transition-all"
                    >
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" />
                      {imageFile ? (
                        <div className="text-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-2 text-emerald-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <p className="text-sm font-medium text-[#1a2332] truncate max-w-[180px]">{imageFile.name}</p>
                          <p className="text-xs text-[#4f73d1] mt-1">اضغط للتغيير</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-10 h-10 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mx-auto mb-2 text-[#3453a7]">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <p className="text-sm text-neutral-500 font-medium">اضغط لرفع صورة</p>
                          <p className="text-xs text-neutral-400 mt-1">PNG, JPG, WEBP</p>
                        </div>
                      )}
                    </div>

                    <Input
                      placeholder="اسم المنتج"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-[#3453a7]/30 focus-visible:ring-[#3453a7]/30"
                    />
                    <Input
                      placeholder="السعر (نقطة)"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="border-[#3453a7]/30 focus-visible:ring-[#3453a7]/30"
                    />
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full h-10 appearance-none bg-white border border-[#3453a7]/30 rounded-lg px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#3453a7]/30 transition-all"
                    >
                      <option value="">اختر الفئة...</option>
                      {categories.filter(cat => cat.name !== "المظاهر").map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl border border-[#3453a7]/50 bg-[#3453a7]/10 hover:bg-[#3453a7]/20 text-[#4f73d1] hover:text-[#3453a7] text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {loading ? "جاري الإضافة..." : "حفظ المنتج"}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column: Products Grid */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#1a2332]">قائمة المنتجات</h2>
                <span className="px-3 py-1 rounded-full border border-[#3453a7]/30 bg-[#3453a7]/8 text-sm font-semibold text-[#4f73d1]">
                  {products.filter(p => !p.theme_key).length} منتج
                </span>
              </div>

              {products.filter(p => !p.theme_key).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-[#3453a7]/40">
                  <div className="w-12 h-12 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mb-3 text-[#3453a7]">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-neutral-500 font-medium">لا توجد منتجات بعد</p>
                  <p className="text-neutral-400 text-sm mt-1">أضف منتجاتك من القائمة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.filter(p => !p.theme_key).map((prod) => (
                    <div key={prod.id} className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                      {/* Product Image */}
                      <div className="h-36 w-full bg-[#fafaf9] relative overflow-hidden flex items-center justify-center">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[#3453a7]/30">
                            <ImageIcon className="w-10 h-10" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className="bg-white/90 text-[#4f73d1] text-xs font-semibold px-2 py-0.5 rounded-lg border border-[#3453a7]/30">
                            {categories.find(c => c.id === prod.category_id)?.name || "عام"}
                          </span>
                        </div>
                      </div>
                      {/* Product Info */}
                      <div className="p-4 flex flex-col flex-1 justify-between">
                        <h3 className="font-bold text-[#1a2332] text-sm line-clamp-1">{prod.name}</h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#3453a7]/20">
                          <span className="font-bold text-[#4f73d1]">{prod.price} <span className="text-xs font-normal text-neutral-400">نقطة</span></span>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="w-7 h-7 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Custom Confirm Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-xl p-6 w-full max-w-sm mx-4 space-y-5">
            <p className="text-base font-semibold text-[#1a2332] text-center">{confirmMessage}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50 text-sm font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { setConfirmOpen(false); confirmCallback?.(); }}
                className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 text-sm font-semibold transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
