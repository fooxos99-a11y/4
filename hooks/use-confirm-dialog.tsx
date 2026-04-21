"use client"

import type React from "react"

import { create } from "zustand"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DialogStore {
  confirm: {
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    onConfirm?: () => void
    onCancel?: () => void
  }
  alert: {
    isOpen: boolean
    title: string
    message: string
    onClose?: () => void
  }
}

const useDialogStore = create<DialogStore>((set) => ({
  confirm: {
    isOpen: false,
    title: "",
    message: "",
    confirmText: "حسناً",
    cancelText: "لا",
    onConfirm: undefined,
    onCancel: undefined,
  },
  alert: {
    isOpen: false,
    title: "",
    message: "",
    onClose: undefined,
  },
}))

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { confirm, alert } = useDialogStore()
  const shouldShowAlertTitle = Boolean(alert.title && alert.title !== "نجاح")
  const accessibleAlertTitle = alert.title || "تنبيه"

  const handleConfirm = () => {
    confirm.onConfirm?.()
    useDialogStore.setState((state) => ({
      ...state,
      confirm: { ...state.confirm, isOpen: false },
    }))
  }

  const handleCancel = () => {
    confirm.onCancel?.()
    useDialogStore.setState((state) => ({
      ...state,
      confirm: { ...state.confirm, isOpen: false },
    }))
  }

  const handleAlertClose = () => {
    alert.onClose?.()
    useDialogStore.setState((state) => ({
      ...state,
      alert: { ...state.alert, isOpen: false },
    }))
  }

  return (
    <>
      {children}
      {/* Confirmation Dialog */}
      <AlertDialog open={confirm.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border border-[#3453a7]/20 bg-white p-0 shadow-[0_24px_60px_rgba(19,39,89,0.18)]" dir="rtl">
          <AlertDialogHeader className="gap-0 border-b border-[#3453a7]/15 bg-gradient-to-r from-[#3453a7]/8 to-transparent px-6 py-5 text-right">
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg font-bold text-[#1a2332]">{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-7 text-[#1a2332]/70">
                {confirm.message}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-0 flex-row-reverse gap-3 border-t border-[#3453a7]/15 px-6 py-4 sm:flex-row-reverse sm:justify-start">
            <AlertDialogCancel
              onClick={handleCancel}
              className="mt-0 h-10 min-w-[110px] rounded-xl border-[#3453a7]/25 bg-white px-4 text-[#274187] shadow-none hover:bg-[#f4f7ff] hover:text-[#1f3673] focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/20"
            >
              {confirm.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="h-10 min-w-[110px] rounded-xl border border-[#3453a7]/30 bg-[linear-gradient(135deg,#24428f_0%,#3453a7_55%,#4f73d1_100%)] px-4 font-medium text-white shadow-none transition-colors hover:brightness-105 focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/20"
            >
              {confirm.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog */}
      <AlertDialog open={alert.isOpen} onOpenChange={(open) => !open && handleAlertClose()}>
        <AlertDialogContent className="sm:max-w-[400px] overflow-hidden rounded-2xl border border-[#3453a7]/20 bg-white p-0 shadow-[0_24px_60px_rgba(19,39,89,0.18)]" dir="rtl">
          <AlertDialogHeader className="gap-0 border-b border-[#3453a7]/15 bg-gradient-to-r from-[#3453a7]/8 to-transparent px-6 py-5 text-right">
            <div className={`w-full ${shouldShowAlertTitle ? "space-y-1.5" : "pt-0.5"}`}>
              <AlertDialogTitle className={shouldShowAlertTitle ? "text-lg font-bold text-[#1a2332]" : "sr-only"}>
                {accessibleAlertTitle}
              </AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line text-sm leading-7 text-[#1a2332]/70">
                {alert.message}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-0 border-t border-[#3453a7]/15 px-6 py-4">
            <AlertDialogAction
              onClick={handleAlertClose}
              className="h-10 w-full rounded-xl border border-[#3453a7]/30 bg-[linear-gradient(135deg,#24428f_0%,#3453a7_55%,#4f73d1_100%)] font-medium text-white shadow-none transition-colors hover:brightness-105 focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/20"
            >
              موافق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface ConfirmDialogOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export function useConfirmDialog() {
  return (options: string | ConfirmDialogOptions, fallbackTitle?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Handle both string and object formats
      const config =
        typeof options === "string"
          ? {
              title: fallbackTitle || "تأكيد العملية",
              message: options,
              confirmText: "حسناً",
              cancelText: "لا",
            }
          : {
              title: options.title || "تأكيد العملية",
              message: options.description || "",
              confirmText: options.confirmText || "حسناً",
              cancelText: options.cancelText || "لا",
            }

      useDialogStore.setState((state) => ({
        ...state,
        confirm: {
          ...config,
          isOpen: true,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      }))
    })
  }
}

export function useAlertDialog() {
  return (message: string, title = "تنبيه"): Promise<void> => {
    return new Promise((resolve) => {
      useDialogStore.setState((state) => ({
        ...state,
        alert: {
          isOpen: true,
          title,
          message,
          onClose: () => resolve(),
        },
      }))
    })
  }
}
