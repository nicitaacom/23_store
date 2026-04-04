"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { useDebounce } from "@/hooks/useDebounce"

interface CatalogSearchFormProps {
  locale: string
  initialQuery: string
  perPage: number
  ariaLabel: string
  placeholder: string
  submitLabel: string
}

function createCatalogSearchHref(locale: string, perPage: number, query: string) {
  const params = new URLSearchParams({
    page: "1",
    perPage: String(perPage),
  })

  if (query) {
    params.set("query", query)
  }

  return `/${locale}?${params.toString()}`
}

export function CatalogSearchForm({
  locale,
  initialQuery,
  perPage,
  ariaLabel,
  placeholder,
  submitLabel,
}: CatalogSearchFormProps) {
  const router = useRouter()
  const normalizedInitialQuery = initialQuery.trim()
  const [query, setQuery] = useState(normalizedInitialQuery)
  const debouncedQuery = useDebounce(query.trim(), 3000)
  const lastNavigatedQueryRef = useRef(normalizedInitialQuery)

  useEffect(() => {
    const nextInitialQuery = initialQuery.trim()

    setQuery(nextInitialQuery)
    lastNavigatedQueryRef.current = nextInitialQuery
  }, [initialQuery])

  useEffect(() => {
    const nextQuery = debouncedQuery.trim()

    if (nextQuery === lastNavigatedQueryRef.current) return

    lastNavigatedQueryRef.current = nextQuery
    router.replace(createCatalogSearchHref(locale, perPage, nextQuery), { scroll: false })
  }, [debouncedQuery, locale, perPage, router])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextQuery = query.trim()

    if (nextQuery === lastNavigatedQueryRef.current) return

    lastNavigatedQueryRef.current = nextQuery
    router.replace(createCatalogSearchHref(locale, perPage, nextQuery), { scroll: false })
  }

  return (
    <form
      className="flex w-full items-center justify-between gap-2 rounded-[2px] border border-success/15 bg-gradient-to-r from-background via-background/95 to-success/5 p-1 shadow-[0_18px_45px_rgba(34,197,94,0.08)] backdrop-blur-sm"
      onSubmit={handleSubmit}>
      <input
        aria-label={ariaLabel}
        className="h-10 w-full rounded-[2px] bg-transparent px-3 text-base text-title outline-none placeholder:text-subTitle"
        name="query"
        onChange={event => setQuery(event.currentTarget.value)}
        placeholder={placeholder}
        type="search"
        value={query}
      />
      <button
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-[2px] border border-success/30 bg-success/10 px-4 text-sm font-semibold text-success transition-all duration-300 hover:border-success hover:bg-success hover:text-black"
        type="submit">
        {submitLabel}
      </button>
    </form>
  )
}
