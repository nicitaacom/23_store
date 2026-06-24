"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import { useCategoryPreferencesStore } from "@/store/categories/useCategoryPreferencesStore"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { useSupportPrefilledMessage } from "@/store/ui/useSupportPrefilledMessage"

interface CategoryPillBarProps {
  categories: TCategory[]
  isAuthenticated: boolean
  locale: string
}

const ALL_ID = "__all__"

export function CategoryPillBar({ categories, isAuthenticated, locale }: CategoryPillBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategoryId = searchParams.get("category")

  const [mounted, setMounted] = useState(false)
  const { views, recordView, getSortedCategories } = useCategoryPreferencesStore()
  const { openDropdown } = useSupportDropdown()
  const { set: setPrefilledMessage } = useSupportPrefilledMessage()

  const activePillRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Scroll active pill into view on mount and when category changes
  useEffect(() => {
    if (!mounted) return
    activePillRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
  }, [mounted, activeCategoryId])

  const rootCategories = useMemo(
    () => categories.filter(c => c.parent_id === null),
    [categories],
  )

  const sortedCategories = useMemo(
    () => (mounted ? getSortedCategories(categories) : rootCategories),
    [mounted, views, categories, rootCategories, getSortedCategories],
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

    if (categoryId) {
      recordView(categoryId)
      if (isAuthenticated) {
        categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId }).catch(() => {})
      }
    }
  }

  const handleRequestCategory = () => {
    setPrefilledMessage("Hi! I'd like to request a new category: ")
    openDropdown()
  }

  const isAllActive = !activeCategoryId

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* All pill */}
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

        {/* Category pills */}
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

      {/* Request new category */}
      <button
        className="h-8 shrink-0 rounded border border-border-color/35 bg-background/55 px-3 text-sm text-subTitle transition-colors duration-150 hover:bg-foreground/10 hover:text-title"
        type="button"
        onClick={handleRequestCategory}>
        + Request
      </button>
    </div>
  )
}
