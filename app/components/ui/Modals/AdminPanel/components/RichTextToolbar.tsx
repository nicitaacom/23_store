"use client"

import { useRef } from "react"

interface RichTextToolbarProps {
  onWrap: (marker: string) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function RichTextToolbar({ onWrap }: RichTextToolbarProps) {
  const keyboardActivationAtRef = useRef(0)

  return (
    <div className="flex gap-1">
      {[
        { label: "B", title: "Bold (**text**)", marker: "**", className: "font-bold" },
        { label: "I", title: "Italic (*text*)", marker: "*", className: "italic" },
        { label: "U", title: "Underline (_text_)", marker: "_", className: "underline" },
      ].map(({ label, title, marker, className }) => (
        <button
          className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-xs text-white/60 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          key={label}
          type="button"
          title={title}
          aria-label={title}
          onMouseDown={event => {
            event.preventDefault()
            onWrap(marker)
          }}
          onKeyDown={event => {
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            keyboardActivationAtRef.current = Date.now()
            onWrap(marker)
          }}
          onClick={event => {
            if (event.detail === 0 && Date.now() - keyboardActivationAtRef.current > 250) onWrap(marker)
          }}>
          <span className={className}>{label}</span>
        </button>
      ))}
    </div>
  )
}
