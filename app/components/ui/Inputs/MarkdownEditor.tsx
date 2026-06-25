"use client"

import { forwardRef, useEffect, useRef } from "react"
import { twMerge } from "tailwind-merge"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export const MarkdownEditor = forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  ({ value, onChange, onBlur, placeholder, disabled, className }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef

    // Auto-resize to content
    useEffect(() => {
      const el = resolvedRef.current
      if (!el) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }, [value, resolvedRef])

    const isEmpty = !value?.trim()

    return (
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-white/40 select-none">
            {placeholder}
          </div>
        )}
        <textarea
          ref={resolvedRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          rows={4}
          className={twMerge(
            "min-h-[100px] w-full resize-none overflow-hidden rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors duration-150 focus:border-white/20 focus:bg-white/[0.06]",
            disabled && "animate-pulse opacity-50 cursor-default",
            className,
          )}
        />
      </div>
    )
  }
)

MarkdownEditor.displayName = "MarkdownEditor"
