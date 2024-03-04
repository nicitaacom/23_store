"use client"

import useToast from "@/store/ui/useToast"
import { AnimatePresence } from "framer-motion"

const Toast = async () => {
  const toast = import("@/components/ui/Toast")
  const { Toast } = await toast
  return <Toast />
}

export default function ToastProvider() {
  const toast = useToast()

  return <AnimatePresence>{toast.isOpen && <Toast />}</AnimatePresence>
}
