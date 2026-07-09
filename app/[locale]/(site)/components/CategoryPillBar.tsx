"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useCategoryPreferencesStore } from "@/store/categories/useCategoryPreferencesStore"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { useSupportPrefilledMessage } from "@/store/ui/useSupportPrefilledMessage"

interface CategoryPillBarProps {
  categories: TCategory[]
  isAuthenticated: boolean
  locale: string
  serverViews: Record<string, number>
}

export function CategoryPillBar({ categories, isAuthenticated, locale, serverViews }: CategoryPillBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategoryId = searchParams.get("category")

  const [mounted, setMounted] = useState(false)
  // sessionViews: optimistic local increments during this session (for immediate pill reorder feedback)
  const [sessionViews, setSessionViews] = useState<Record<string, number>>({})
  const { getSortedCategories } = useCategoryPreferencesStore()
  const { addView } = useAnonCategoryViewsStore()

  const { openDropdown } = useSupportDropdown()
  const { set: setPrefilledMessage } = useSupportPrefilledMessage()

  const activePillRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    activePillRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
  }, [mounted, activeCategoryId])

  const rootCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories])

  // Merge serverViews with sessionViews for pill ordering
  const mergedViews = useMemo(() => {
    const merged = { ...serverViews }
    for (const [id, count] of Object.entries(sessionViews)) {
      merged[id] = (merged[id] ?? 0) + count
    }
    return merged
  }, [serverViews, sessionViews])

  const sortedCategories = useMemo(
    () => (mounted ? getSortedCategories(categories, mergedViews) : rootCategories),
    [mounted, mergedViews, categories, rootCategories, getSortedCategories],
  )

  const handlePillClick = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categoryId) {
      params.set("category", categoryId)
    } else {
      params.delete("category")
    }
    params.set("page", "1")
    router.push(`/${locale}?${params.toString()}`)

    if (!categoryId) return

    setSessionViews(prev => ({ ...prev, [categoryId]: (prev[categoryId] ?? 0) + 1 }))
    if (isAuthenticated) categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId, delta: 1 }).catch(() => {})
    else addView(categoryId, 1)
  }

  const handleRequestCategory = () => {
    setPrefilledMessage("Hi! I'd like to request a new category: ")
    openDropdown()
  }

  const isAllActive = !activeCategoryId

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          ref={isAllActive ? activePillRef : null}
          className={twMerge(
            "h-8 shrink-0 rounded border px-3 text-sm transition-colors duration-150",
            isAllActive
              ? "border-success/40 bg-success/10 font-medium text-success"
              : "border-border-color/35 bg-background/55 text-subTitle hover:border-border-color hover:bg-foreground/10 hover:text-title",
          )}
          type="button"
          onClick={() => handlePillClick(null)}>
          All
        </button>

        {sortedCategories.map(category => {
          const isActive = activeCategoryId === category.id
          return (
            <button
              key={category.id}
              ref={isActive ? activePillRef : null}
              className={twMerge(
                "h-8 shrink-0 rounded border px-3 text-sm transition-colors duration-150",
                isActive
                  ? "border-success/40 bg-success/10 font-medium text-success"
                  : "border-border-color/35 bg-background/55 text-subTitle hover:border-border-color hover:bg-foreground/10 hover:text-title",
              )}
              type="button"
              onClick={() => handlePillClick(category.id)}>
              {category.name}
            </button>
          )
        })}
      </div>

      <button
        className="h-8 shrink-0 rounded border border-border-color/35 bg-background/55 px-3 text-sm text-subTitle transition-colors duration-150 hover:bg-foreground/10 hover:text-title"
        type="button"
        onClick={handleRequestCategory}>
        + Request
      </button>
    </div>
  )
}
