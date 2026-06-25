"use client"

import { FormEvent, useEffect, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BiLoaderAlt, BiSearchAlt } from "react-icons/bi"

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
  const searchParams = useSearchParams()
  const normalizedInitialQuery = initialQuery.trim()
  const [query, setQuery] = useState(normalizedInitialQuery)
  const [isPending, startTransition] = useTransition()
  const debouncedQuery = useDebounce(query.trim(), 3000)
  const lastNavigatedQueryRef = useRef(normalizedInitialQuery)

  useEffect(() => {
    const nextInitialQuery = initialQuery.trim()

    setQuery(nextInitialQuery)
    lastNavigatedQueryRef.current = nextInitialQuery
  }, [initialQuery])

  useEffect(() => {
    const currentQuery = searchParams?.get("query")?.trim() ?? ""

    if (currentQuery === lastNavigatedQueryRef.current) {
      setQuery(currentQuery)
    }
  }, [searchParams])

  useEffect(() => {
    const nextQuery = debouncedQuery.trim()

    if (nextQuery === lastNavigatedQueryRef.current) return

    lastNavigatedQueryRef.current = nextQuery
    startTransition(() => {
      router.replace(createCatalogSearchHref(locale, perPage, nextQuery), { scroll: false })
    })
  }, [debouncedQuery, locale, perPage])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextQuery = query.trim()

    if (nextQuery === lastNavigatedQueryRef.current) return

    lastNavigatedQueryRef.current = nextQuery
    startTransition(() => {
      router.replace(createCatalogSearchHref(locale, perPage, nextQuery), { scroll: false })
    })
  }

  return (
    <form
      className={`relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-[2px] border p-1 shadow-[0_18px_45px_rgba(34,197,94,0.08)] backdrop-blur-sm transition-all duration-300 ${
        isPending
          ? "border-success/40 bg-gradient-to-r from-background via-success/10 to-background shadow-[0_20px_60px_rgba(34,197,94,0.18)]"
          : "border-success/15 bg-gradient-to-r from-background via-background/95 to-success/5"
      }`}
      onSubmit={handleSubmit}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-success/20 to-transparent transition-opacity duration-300 ${
          isPending ? "animate-[searchSweep_1.2s_linear_infinite] opacity-100" : "opacity-0"
        }`}
      />
      <input
        aria-label={ariaLabel}
        className="relative h-10 w-full rounded-[2px] bg-transparent px-3 text-base text-title outline-none placeholder:text-subTitle"
        name="query"
        onChange={event => setQuery(event.currentTarget.value)}
        placeholder={placeholder}
        type="search"
        value={query}
      />
      <button
        aria-busy={isPending}
        className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[2px] border px-4 text-sm font-semibold transition-all duration-300 ${
          isPending
            ? "border-success bg-success text-black"
            : "border-success/30 bg-success/10 text-success hover:border-success hover:bg-success hover:text-black"
        }`}
        disabled={isPending}
        type="submit">
        {isPending ? <BiLoaderAlt className="animate-spin text-base" /> : <BiSearchAlt className="text-base" />}
        <span>{isPending ? "Searching..." : submitLabel}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {isPending ? "Searching products" : ""}
      </span>
    </form>
  )
}
