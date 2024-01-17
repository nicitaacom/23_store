"use client"

import { Toast } from "@/components/ui/Toast"
import useToast from "@/store/ui/useToast"
import { AnimatePresence } from "framer-motion"

export function ToastProvider() {
  const toast = useToast()

  return <AnimatePresence>{toast.isOpen && <Toast />}</AnimatePresence>
}
