"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { FiWifiOff } from "react-icons/fi"

import { useIsOnline } from "@/hooks/useIsOnline"
import { useScopedI18n } from "@/locales/client"

// Fixed red bar pinned to the bottom of the viewport while the browser is offline.
// Mounted once at the app root so every screen (and any button click made while
// offline) surfaces the same connection warning.
export function OfflineBanner() {
  const t = useScopedI18n("common")
  const isOnline = useIsOnline()
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role="status"
          aria-live="assertive"
          className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 border-t border-danger/40 bg-danger px-3 py-2 text-sm font-medium text-title-foreground"
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 12 }}
          transition={reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}>
          <FiWifiOff size={16} />
          {t("no_internet_connection")}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
