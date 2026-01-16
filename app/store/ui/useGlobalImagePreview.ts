import { create } from "zustand"

type IGlobalImagePreview = {
  image: File | null
  side: "user" | "support"
  isFullscreen: boolean
  setImage: (image: File | null, side: "user" | "support", isFullscreen?: boolean) => void
  clearImage: () => void
}

export const useGlobalImagePreview = create<IGlobalImagePreview>()(set => ({
  image: null,
  side: "user",
  isFullscreen: true, // default to fullscreen for global usage
  setImage: (image, side, isFullscreen = true) => set({ image, side, isFullscreen }),
  clearImage: () => set({ image: null }),
}))
