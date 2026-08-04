"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useCategoryPreferences } from "@/store/categories/useCategoryPreferences"
import { useHasMounted } from "@/hooks/useHasMounted"
import { useScopedI18n } from "@/locales/client"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { useSupportPrefilledMessage } from "@/store/ui/useSupportPrefilledMessage"

interface CategoryPillBarProps {
  categories: TCategory[]
  isAuthenticated: boolean
  locale: string
  serverViews: Record<string, number>
}

function getCategoryButtonClassName(isActive: boolean) {
  return twMerge(
    "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-3.5 text-sm font-medium shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/45",
    isActive
      ? "border-success/55 bg-success/15 text-success shadow-success/10"
      : "border-border-color/45 bg-background/70 text-subTitle shadow-background/40 hover:border-success/40 hover:bg-success/5 hover:text-title",
  )
}

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function CategoryPillBar({ categories, isAuthenticated, locale, serverViews }: CategoryPillBarProps) {
  const t = useScopedI18n("category")
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategoryId = searchParams.get("category")

  const mounted = useHasMounted()
  // sessionViews: optimistic local increments during this session (for immediate pill reorder feedback)
  const [sessionViews, setSessionViews] = useState<Record<string, number>>({})
  const { getSortedCategories } = useCategoryPreferences()
  const { addView } = useAnonCategoryViewsStore()

  const { openDropdown } = useSupportDropdown()
  const { set: setPrefilledMessage } = useSupportPrefilledMessage()

  const activePillRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!mounted) return
    activePillRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
  }, [mounted, activeCategoryId])

  const rootCategories = useMemo(() => categories.filter(category => category.parent_id === null), [categories])

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
    <div className="flex w-full items-center gap-2">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          className={getCategoryButtonClassName(isAllActive)}
          ref={isAllActive ? activePillRef : null}
          type="button"
          onClick={() => handlePillClick(null)}>
          {t("all")}
        </button>

        {sortedCategories.map(category => {
          const isActive = activeCategoryId === category.id
          return (
            <button
              className={getCategoryButtonClassName(isActive)}
              key={category.id}
              ref={isActive ? activePillRef : null}
              type="button"
              onClick={() => handlePillClick(category.id)}>
              {category.name}
            </button>
          )
        })}
      </div>

      <button
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-success/35 bg-success/5 px-3.5 text-sm font-medium text-title shadow-sm shadow-success/5 transition-colors duration-150 hover:border-success/60 hover:bg-success/15 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/45"
        type="button"
        onClick={handleRequestCategory}>
        <span className="text-base leading-none text-success" aria-hidden="true">
          +
        </span>
        {t("request")}
      </button>
    </div>
  )
}
