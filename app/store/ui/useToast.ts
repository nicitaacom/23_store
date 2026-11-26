import { create } from "zustand"

import { IToast } from "@/ts/interfaces/IToast"

/* usage
const message = useMessage()

message.show('status',?'title',?'subTitle',?timeout)
e.g
message.show('success')
message.show('success','custom title')
message.show('success','custom title','custom subTitle')
message.show('success','custom title','custom subTitle',3000) //disashow after 3s

*/

let toastTimer: ReturnType<typeof setTimeout> | null = null

async function trackErrorToast(title?: string) {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined" || !window.crypto?.subtle) return
  const normalizedTitle = title?.trim().toLowerCase() || "untitled error"
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedTitle))
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
  await fetch("/api/store-errors", { method: "POST", body: fingerprint, keepalive: true })
}

export const useToast = create<IToast>(set => ({
  isOpen: false,
  variant: "success",

  show: (status, title, subTitle, timeoutInMs = 8000) => {
    if (status === "error") void trackErrorToast(title).catch(() => {})

    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }

    set({
      isOpen: true,
      variant: status,
      title,
      subTitle,
    })

    if (typeof timeoutInMs === "number" && timeoutInMs > 0) {
      toastTimer = setTimeout(() => {
        toastTimer = null
        set({ isOpen: false })
      }, timeoutInMs)
    }
  },

  close: () => {
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }

    set({ isOpen: false })
  },
}))
export default useToast
