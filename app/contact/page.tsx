"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { getOfflineErrorMessage } from "@/lib/network-error"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const showAlert = useAlertDialog()

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    const userName = localStorage.getItem("userName")

    // Only set name if user is logged in (has a role)
    if (userRole && userName) {
      setFormData((prev) => ({ ...prev, name: userName }))
    }
  }, [])
  // </CHANGE>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await showAlert("لا يوجد اتصال بالإنترنت", "خطأ")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        await showAlert("تم إرسال رسالتك بنجاح!", "نجاح")
        setFormData({ name: "", subject: "", message: "" })
      } else {
        await showAlert(data.error || "حدث خطأ أثناء إرسال الرسالة", "خطأ")
      }
    } catch (error) {
      console.error("[v0] Error submitting form:", error)
      await showAlert(getOfflineErrorMessage(error) || "حدث خطأ أثناء إرسال الرسالة", "خطأ")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Header />
      <main className="flex-1 bg-white py-12 md:py-20">
        <div className="container mx-auto px-3 md:px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-16 text-[#1a2332]">تواصل معنا</h1>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border-2 md:border-4 border-[#3453a7]">
              <h2 className="text-xl md:text-3xl font-bold text-center mb-6 md:mb-8 text-[#1a2332]">أرسل لنا رسالة</h2>

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-base md:text-lg font-semibold text-[#1a2332] mb-2">
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسمك"
                    className="w-full px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-[#3453a7] focus:outline-none text-[#1a2332] placeholder:text-gray-400"
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label htmlFor="subject" className="block text-base md:text-lg font-semibold text-[#1a2332] mb-2">
                    موضوع الرسالة <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-[#3453a7] focus:outline-none text-[#1a2332] bg-white"
                  >
                    <option value="">اختر موضوع الرسالة</option>
                    <option value="inquiry">استفسار عام</option>
                    <option value="registration">التسجيل في الحلقات</option>
                    <option value="programs">الاستفسار عن البرامج</option>
                    <option value="complaint">شكوى أو اقتراح</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-base md:text-lg font-semibold text-[#1a2332] mb-2">
                    الرسالة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="اكتب رسالتك هنا"
                    rows={4}
                    className="w-full px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-[#3453a7] focus:outline-none text-[#1a2332] placeholder:text-gray-400 resize-none md:min-h-[150px]"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#3453a7] hover:bg-[#4f73d1] text-white font-bold py-3 md:py-4 text-base md:text-lg rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
