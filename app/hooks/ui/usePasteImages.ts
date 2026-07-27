"use client"

import { useEffect } from "react"

interface UsePasteImagesOptions {
  isHookEnabled?: boolean
}

/**
 * Turns a Ctrl+V anywhere on the page into image files.
 *
 * A screenshot in the clipboard arrives as an `image/*` item on the paste event - this reads those
 * items and hands the files over, so a form with a drop zone also accepts pasted screenshots.
 * Text pasted into an input stays text: the handler only steps in when the clipboard holds files.
 *
 * ## Usage
 * ```tsx
 * usePasteImages(files => addImages(files), { isHookEnabled: !isLoading })
 * ```
 */
export function usePasteImages(onPasteImages: (files: File[]) => void, { isHookEnabled = true }: UsePasteImagesOptions = {}) {
  useEffect(() => {
    if (!isHookEnabled) return

    function handlePaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.items ?? [])]
        .filter(item => item.kind === "file" && item.type.startsWith("image/"))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null)

      if (!files.length) return

      event.preventDefault()
      onPasteImages(files)
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHookEnabled])
}
