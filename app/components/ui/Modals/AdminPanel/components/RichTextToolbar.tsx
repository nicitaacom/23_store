"use client"

interface RichTextToolbarProps {
  onWrap: (marker: string) => void
}

export function RichTextToolbar({ onWrap }: RichTextToolbarProps) {
  return (
    <div className="flex gap-1 pb-1">
      {[
        { label: "B", title: "Bold (**text**)", marker: "**", className: "font-bold" },
        { label: "I", title: "Italic (*text*)", marker: "*", className: "italic" },
        { label: "U", title: "Underline (_text_)", marker: "_", className: "underline" },
      ].map(({ label, title, marker, className }) => (
        <button
          className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.04] text-xs text-white/60 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90"
          key={label}
          type="button"
          title={title}
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); onWrap(marker) }}>
          <span className={className}>{label}</span>
        </button>
      ))}
    </div>
  )
}
