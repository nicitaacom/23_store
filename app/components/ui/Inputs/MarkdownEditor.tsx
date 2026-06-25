"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { twMerge } from "tailwind-merge"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function lineToHtml(line: string) {
  if (!line) return "<br>"
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<u>$1</u>")
}

function toHtml(raw: string) {
  return raw.split("\n").map(line => `<div>${lineToHtml(line)}</div>`).join("")
}

function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}

function setCaretOffset(el: HTMLElement, offset: number) {
  try {
    const sel = window.getSelection()
    const range = document.createRange()
    const iter = document.createNodeIterator(el, NodeFilter.SHOW_TEXT)
    let remaining = offset
    let node: Text | null
    while ((node = iter.nextNode() as Text | null)) {
      if (remaining <= node.length) {
        range.setStart(node, remaining)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
        return
      }
      remaining -= node.length
    }
    range.selectNodeContents(el)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
  } catch {}
}

// Walk DOM text nodes to get plain text (works after toHtml rendering)
function domToRaw(el: HTMLElement): string {
  const lines: string[] = []
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      lines.push(node.textContent ?? "")
    } else {
      // DIV/P = one line; collect all text nodes inside
      let text = ""
      const iter = document.createNodeIterator(node, NodeFilter.SHOW_TEXT)
      let t: Text | null
      while ((t = iter.nextNode() as Text | null)) text += t.textContent
      lines.push(text)
    }
  })
  return lines.join("\n").replace(/\n$/, "")
}

export const MarkdownEditor = forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  ({ value, onChange, onBlur, placeholder, disabled, className }, ref) => {
    const divRef = useRef<HTMLDivElement>(null)
    // rawRef holds the markdown source — single source of truth
    const rawRef = useRef(value)
    const isFocusedRef = useRef(false)

    useEffect(() => {
      if (divRef.current) divRef.current.innerHTML = toHtml(value || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync when value changes from outside (RichTextToolbar inserts markers)
    useEffect(() => {
      if (rawRef.current === value) return
      rawRef.current = value
      const el = divRef.current
      if (!el) return
      const caret = isFocusedRef.current ? getCaretOffset(el) : 0
      el.innerHTML = toHtml(value || "")
      if (isFocusedRef.current) setCaretOffset(el, caret)
    }, [value])

    useImperativeHandle(ref, () => ({
      get value() { return rawRef.current },
      set value(_v: string) {},
      get selectionStart() {
        if (!divRef.current) return 0
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return 0
        const range = sel.getRangeAt(0)
        const pre = range.cloneRange()
        pre.selectNodeContents(divRef.current)
        pre.setEnd(range.startContainer, range.startOffset)
        return pre.toString().length
      },
      get selectionEnd() {
        return divRef.current ? getCaretOffset(divRef.current) : 0
      },
      focus() { divRef.current?.focus() },
    } as unknown as HTMLTextAreaElement))

    // On every keystroke: read rendered DOM → extract visible text → that IS the raw markdown
    // because we only re-render on paste/external update, so during typing the DOM still has ** markers
    const handleInput = () => {
      const el = divRef.current
      if (!el) return
      const raw = domToRaw(el)
      rawRef.current = raw
      onChange(raw)
    }

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault()
      const el = divRef.current
      if (!el) return
      const pasted = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
      const caretBefore = getCaretOffset(el)
      const current = rawRef.current
      const raw = current.slice(0, caretBefore) + pasted + current.slice(caretBefore)
      rawRef.current = raw
      onChange(raw)
      el.innerHTML = toHtml(raw)
      setCaretOffset(el, caretBefore + pasted.length)
    }

    const isEmpty = !value?.trim()

    return (
      <div className="relative text-white">
        {isEmpty && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-white/40 select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={divRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => { isFocusedRef.current = true }}
          onBlur={() => { isFocusedRef.current = false; onBlur?.() }}
          className={twMerge(
            "min-h-[100px] w-full rounded border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors duration-150 focus:border-white/20 focus:bg-white/[0.06] [&_strong]:font-bold [&_strong]:text-white [&_em]:italic [&_em]:text-white/70 [&_u]:underline",
            disabled && "opacity-50 cursor-default",
            className,
          )}
        />
      </div>
    )
  }
)

MarkdownEditor.displayName = "MarkdownEditor"
