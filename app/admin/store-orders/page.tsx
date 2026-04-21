"use client";
import { getSupabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, ShoppingBag, Package, Check, Trash2 } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function StoreOrdersPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المتجر");

  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  function showConfirm(msg: string, cb: () => void) {
    setConfirmMessage(msg);
    setConfirmCallback(() => cb);
    setConfirmOpen(true);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase
        .from("store_orders")
        .select('*')
        .order("created_at", { ascending: false });

      const { data: productsData } = await supabase
        .from("store_products")
        .select('id, theme_key');

      const themeProductIds = new Set((productsData || [])
        .filter(p => !!p.theme_key)
        .map(p => p.id));

      const filteredOrders = (data || []).filter((o: any) => {
        return !themeProductIds.has(o.product_id);
      });
      
    setOrders(filteredOrders);
    setLoading(false);
  }

  const notDelivered = orders.filter((o) => !o.is_delivered);
  const delivered = orders.filter((o) => o.is_delivered);

  // تعليم جميع الطلبات كـ تم التسليم
  async function markAllAsDelivered() {
    if (notDelivered.length === 0) return;
    const res = await fetch("/api/store-orders/delivered", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all: true }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || "حدث خطأ أثناء تحديث حالة التسليم للجميع!");
      return;
    }
    fetchOrders();
  }

  // حذف جميع الطلبات
  async function deleteAllOrders() {
    showConfirm("هل أنت متأكد من حذف جميع الطلبات في هذه القائمة؟", async () => {
      const idsToDelete = showDelivered
        ? delivered.map((o) => o.id)
        : notDelivered.map((o) => o.id);
      if (idsToDelete.length === 0) return;
      const res = await fetch("/api/store-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "حدث خطأ أثناء حذف الطلبات!");
        return;
      }
      fetchOrders();
    });
  }

  async function deleteOrder(orderId: string) {
    const res = await fetch("/api/store-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || "حدث خطأ أثناء حذف الطلب!");
      return;
    }
    fetchOrders();
  }

  async function markAsDelivered(orderId: string) {
    try {
      const res = await fetch("/api/store-orders/delivered", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "حدث خطأ أثناء تحديث حالة التسليم!");
        return;
      }
      fetchOrders();
    } catch {
      alert("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  }

  const currentList = showDelivered ? delivered : notDelivered;

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">

          {/* Page Header */}
          <div className="flex items-center justify-between border-b border-[#3453a7]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg border border-[#3453a7]/40 flex items-center justify-center text-[#4f73d1] hover:bg-[#3453a7]/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/40 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-[#3453a7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">طلبات الطلاب</h1>
            </div>

            {showDelivered ? (
              <button
                onClick={deleteAllOrders}
                disabled={currentList.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                حذف السجل
              </button>
            ) : (
              <button
                onClick={markAllAsDelivered}
                disabled={currentList.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                تسليم الكل
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white rounded-xl border border-[#3453a7]/40 p-1.5 w-fit">
            <button
              onClick={() => setShowDelivered(false)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                !showDelivered
                  ? "bg-[#3453a7]/15 border border-[#3453a7]/40 text-[#4f73d1]"
                  : "text-neutral-500 hover:text-[#4f73d1] hover:bg-[#3453a7]/5"
              }`}
            >
              الطلبات الجديدة
              <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${!showDelivered ? "bg-[#3453a7]/20 text-[#4f73d1]" : "bg-neutral-100 text-neutral-500"}`}>
                {notDelivered.length}
              </span>
            </button>
            <button
              onClick={() => setShowDelivered(true)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                showDelivered
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                  : "text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              التم تسليمها
              <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${showDelivered ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                {delivered.length}
              </span>
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <SiteLoader />
            </div>
          ) : currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-[#3453a7]/40">
              <div className="w-14 h-14 rounded-xl bg-[#3453a7]/10 border border-[#3453a7]/30 flex items-center justify-center mb-3 text-[#3453a7]">
                <Package className="w-7 h-7" />
              </div>
              <p className="font-bold text-[#1a2332]">لا توجد طلبات هنا</p>
              <p className="text-neutral-400 text-sm mt-1">القائمة فارغة حالياً</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {currentList.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#3453a7]/40 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        showDelivered
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-500"
                          : "bg-[#3453a7]/10 border border-[#3453a7]/30 text-[#3453a7]"
                      }`}>
                        {showDelivered ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-[#1a2332] text-base leading-tight">{order.student_name}</p>
                        <p className="text-sm text-neutral-400 mt-0.5">
                          طلب: <span className="text-[#4f73d1] font-semibold">{order.product_name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!showDelivered && (
                        <button
                          onClick={() => markAsDelivered(order.id)}
                          title="تأكيد التسليم"
                          className="w-9 h-9 rounded-lg border border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteOrder(order.id)}
                        title="حذف الطلب"
                        className="w-9 h-9 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`h-0.5 w-full ${showDelivered ? "bg-emerald-200" : "bg-[#3453a7]/30"}`} />
                </div>
              ))}
            </div>
          )}

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
