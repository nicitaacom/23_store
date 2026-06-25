"use client"

import { useEffect, useRef, useState } from "react"
import { TbChevronDown } from "react-icons/tb"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

interface CategoryDropdownProps {
  categories: TCategory[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  uncategorizedLabel: string
}

export function CategoryDropdown({ categories, value, onChange, disabled, uncategorizedLabel }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useOnEscOrClickOutside(containerRef, () => setOpen(false), { isHookEnabled: open })

  useEffect(() => {
    if (!open) { setSearch(""); return }
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open])

  const parents = categories.filter(c => c.parent_id === null)
  const childrenOf = (parentId: string) => categories.filter(c => c.parent_id === parentId)

  const q = search.toLowerCase().trim()
  const filteredParents = q
    ? parents.filter(p => p.name.toLowerCase().includes(q) || childrenOf(p.id).some(c => c.name.toLowerCase().includes(q)))
    : parents

  const selectedName = categories.find(c => c.id === value)?.name ?? uncategorizedLabel

  const handleSelect = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={twMerge(
          "flex h-10 w-full items-center justify-between gap-2 rounded border border-white/15 bg-white/[0.07] px-3 text-[14px] text-white transition-colors duration-150",
          "hover:border-white/25 hover:bg-white/[0.09] focus:outline-none",
          open && "border-success-accent/35 bg-white/[0.09]",
          disabled && "cursor-default opacity-50",
        )}
        aria-expanded={open}>
        <span className={twMerge("truncate", !value && "text-white/40")}>{selectedName}</span>
        <TbChevronDown size={14} className={twMerge("shrink-0 text-white/40 transition-transform duration-150", open && "rotate-180")} />
      </button>

      <div className={twMerge(
        "absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded border border-white/15 bg-[#0e1010] shadow-compact transition-all duration-150",
        open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
      )}>
        <input
          ref={inputRef}
          className="w-full border-b border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/32 focus:outline-none"
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClick={e => e.stopPropagation()}
        />

        <div className="max-h-[260px] overflow-y-auto">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={twMerge(
              "w-full px-3 py-2 text-left text-sm transition-colors duration-100",
              !value ? "bg-success/10 text-success" : "text-white/50 hover:bg-white/[0.06] hover:text-white",
            )}>
            {uncategorizedLabel}
          </button>

          {filteredParents.map(parent => {
            const children = childrenOf(parent.id).filter(c => !q || c.name.toLowerCase().includes(q) || parent.name.toLowerCase().includes(q))
            return (
              <div key={parent.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(parent.id)}
                  className={twMerge(
                    "w-full px-3 py-2 text-left text-sm font-medium transition-colors duration-100",
                    value === parent.id ? "bg-success/10 text-success" : "text-white hover:bg-white/[0.06]",
                  )}>
                  {parent.name}
                </button>
                {children.map(child => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => handleSelect(child.id)}
                    className={twMerge(
                      "w-full py-1.5 pl-6 pr-3 text-left text-sm transition-colors duration-100",
                      value === child.id ? "bg-success/10 text-success" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                    )}>
                    {child.name}
                  </button>
                ))}
              </div>
            )
          })}

          {filteredParents.length === 0 && (
            <p className="px-3 py-3 text-sm text-white/30">No categories found</p>
          )}
        </div>
      </div>
    </div>
  )
}
