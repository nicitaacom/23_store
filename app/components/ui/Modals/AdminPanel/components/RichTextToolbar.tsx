"use client"

import { MutableRefObject } from "react"

interface RichTextToolbarProps {
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
}

function wrap(textarea: HTMLTextAreaElement, marker: string, onChange: (v: string) => void) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const next = value.slice(0, start) + marker + selected + marker + value.slice(end)
  onChange(next)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + marker.length + selected.length + marker.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

export function RichTextToolbar({ textareaRef, onChange }: RichTextToolbarProps) {
  const handleB = () => { if (textareaRef.current) wrap(textareaRef.current, "**", onChange) }
  const handleI = () => { if (textareaRef.current) wrap(textareaRef.current, "*", onChange) }
  const handleU = () => { if (textareaRef.current) wrap(textareaRef.current, "_", onChange) }

  return (
    <div className="flex gap-1 pb-1">
      {[
        { label: "B", title: "Bold (**text**)", handler: handleB, className: "font-bold" },
        { label: "I", title: "Italic (*text*)", handler: handleI, className: "italic" },
        { label: "U", title: "Underline (_text_)", handler: handleU, className: "underline" },
      ].map(({ label, title, handler, className }) => (
        <button
          key={label}
          type="button"
          title={title}
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); handler() }}
          className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-xs text-white/60 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90">
          <span className={className}>{label}</span>
        </button>
      ))}
    </div>
  )
}
