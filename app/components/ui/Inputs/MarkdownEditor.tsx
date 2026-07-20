"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { twMerge } from "tailwind-merge"

import { markdownToTiptap, tiptapToMarkdown } from "@/utils/markdownTiptap"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onWrapRef?: React.MutableRefObject<((marker: string) => void) | null>
  placeholder?: string
  disabled?: boolean
  className?: string
}

const MARKER_TO_COMMAND = {
  "**": "toggleBold",
  "*": "toggleItalic",
  "_": "toggleUnderline",
} as const

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value, onChange, onBlur, onWrapRef, placeholder, disabled }, ref) => {
    const suppressUpdateRef = useRef(false)

    const initialValueRef = useRef(value)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false, code: false, codeBlock: false }),
      ],
      content: markdownToTiptap(initialValueRef.current),
      immediatelyRender: false,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        if (suppressUpdateRef.current) return
        onChange(tiptapToMarkdown(editor.getJSON() as Parameters<typeof tiptapToMarkdown>[0]))
      },
      onBlur: () => onBlur?.(),
      editorProps: {
        attributes: {
          class: "min-h-[100px] w-full outline-none text-title [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_em]:opacity-70 [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2",
        },
      },
    })

    // Sync only when parent value changes externally (e.g. undo rollback) — skip on first mount
    const isFirstSyncRef = useRef(true)
    useEffect(() => {
      if (!editor) return
      if (isFirstSyncRef.current) { isFirstSyncRef.current = false; return }
      const current = tiptapToMarkdown(editor.getJSON() as Parameters<typeof tiptapToMarkdown>[0])
      if (current === value) return
      suppressUpdateRef.current = true
      editor.commands.setContent(markdownToTiptap(value))
      Promise.resolve().then(() => { suppressUpdateRef.current = false })
    }, [value, editor])

    useEffect(() => {
      if (!editor) return
      editor.setEditable(!disabled)
    }, [disabled, editor])

    // Map marker string → Tiptap chain command
    function wrapSelection(marker: string) {
      if (!editor) return
      const command = MARKER_TO_COMMAND[marker as keyof typeof MARKER_TO_COMMAND]
      if (!command) return
      editor.chain().focus()[command]().run()
    }

    if (onWrapRef) onWrapRef.current = wrapSelection

    useImperativeHandle(ref, () => editor?.view.dom.parentElement as HTMLDivElement)

    const isEmpty = !value?.trim()

    return (
      <div
        className={twMerge(
          "relative overflow-hidden rounded border border-border-color/30 bg-background/60 px-3 py-2 text-sm text-title transition-colors duration-150 focus-within:border-brand/40 focus-within:bg-background",
          disabled && "pointer-events-none cursor-not-allowed bg-foreground/45",
        )}>
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-subTitle select-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    )
  }
)

MarkdownEditor.displayName = "MarkdownEditor"
