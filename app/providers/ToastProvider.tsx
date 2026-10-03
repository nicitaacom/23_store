"use client"

import { lazy, Suspense } from "react"
import { AnimatePresence } from "framer-motion"

import useToast from "@/store/ui/useToast"

const LazyToast = lazy(() => import("@/components/ui/Toast"))

export default function ToastProvider() {
  const toast = useToast()

  return (
    <Suspense fallback={null}>
      <AnimatePresence>{toast.isOpen && <LazyToast />}</AnimatePresence>
    </Suspense>
  )
}
