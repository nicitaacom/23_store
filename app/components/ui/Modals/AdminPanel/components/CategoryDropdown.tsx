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

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function CategoryDropdown({ categories, value, onChange, disabled, uncategorizedLabel }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [prevOpen, setPrevOpen] = useState(open)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useOnEscOrClickOutside(containerRef, () => setOpen(false), { isHookEnabled: open })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) setSearchValue("")
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open])

  const parents = categories.filter(category => category.parent_id === null)
  const childrenOf = (parentId: string) => categories.filter(category => category.parent_id === parentId)

  const query = searchValue.toLowerCase().trim()
  const filteredParents = query
    ? parents.filter(
        parent =>
          parent.name.toLowerCase().includes(query) ||
          childrenOf(parent.id).some(child => child.name.toLowerCase().includes(query)),
      )
    : parents

  const selectedName = categories.find(category => category.id === value)?.name ?? uncategorizedLabel

  const handleOptionSelect = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={twMerge(
          "flex h-10 w-full items-center justify-between gap-2 rounded border border-white/15 bg-white/[0.07] px-3 text-[14px] text-white transition-colors duration-150",
          "hover:border-white/25 hover:bg-white/[0.09] focus:outline-none",
          open && "border-success-accent/35 bg-white/[0.09]",
          disabled && "cursor-default opacity-50",
        )}
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setOpen(prevOpen => !prevOpen)}
        aria-expanded={open}>
        <span className={twMerge("truncate", !value && "text-white/40")}>{selectedName}</span>
        <TbChevronDown
          className={twMerge("shrink-0 text-white/40 transition-transform duration-150", open && "rotate-180")}
          size={14}
        />
      </button>

      <div
        className={twMerge(
          "absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded border border-white/15 bg-[#0e1010] shadow-compact transition-all duration-150",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}>
        <input
          className="w-full border-b border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/32 focus:outline-none"
          ref={inputRef}
          placeholder="Search categories..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onClick={e => e.stopPropagation()}
        />

        <div className="max-h-[260px] overflow-y-auto">
          <button
            className={twMerge(
              "w-full px-3 py-2 text-left text-sm transition-colors duration-100",
              !value ? "bg-success/10 text-success" : "text-white/50 hover:bg-white/[0.06] hover:text-white",
            )}
            type="button"
            onClick={() => handleOptionSelect(null)}>
            {uncategorizedLabel}
          </button>

          {filteredParents.map(parent => {
            const children = childrenOf(parent.id).filter(
              child => !query || child.name.toLowerCase().includes(query) || parent.name.toLowerCase().includes(query),
            )
            return (
              <div key={parent.id}>
                <button
                  className={twMerge(
                    "w-full px-3 py-2 text-left text-sm font-medium transition-colors duration-100",
                    value === parent.id ? "bg-success/10 text-success" : "text-white hover:bg-white/[0.06]",
                  )}
                  type="button"
                  onClick={() => handleOptionSelect(parent.id)}>
                  {parent.name}
                </button>
                {children.map(child => (
                  <button
                    className={twMerge(
                      "w-full py-1.5 pl-6 pr-3 text-left text-sm transition-colors duration-100",
                      value === child.id ? "bg-success/10 text-success" : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                    )}
                    key={child.id}
                    type="button"
                    onClick={() => handleOptionSelect(child.id)}>
                    {child.name}
                  </button>
                ))}
              </div>
            )
          })}

          {filteredParents.length === 0 && <p className="px-3 py-3 text-sm text-white/30">No categories found</p>}
        </div>
      </div>
    </div>
  )
}
