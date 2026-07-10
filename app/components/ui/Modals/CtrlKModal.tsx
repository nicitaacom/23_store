"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BiSearchAlt } from "react-icons/bi"

import { ModalContainer } from "./ModalContainers/"
import { SearchInput } from "../Inputs/SearchInput"
import { useCtrlKModal } from "@/store/ui/useCtrlKModal"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { useDebounce } from "@/hooks/useDebounce"

export function CtrlKModal() {
  const t = useScopedI18n("modal")
  const locale = useCurrentLocale()
  const router = useRouter()
  const ctrlKModal = useCtrlKModal()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 2000)
  const lastSearchQueryRef = useRef("")
  const [prevIsOpen, setPrevIsOpen] = useState(ctrlKModal.isOpen)

  if (ctrlKModal.isOpen !== prevIsOpen) {
    setPrevIsOpen(ctrlKModal.isOpen)
    if (!ctrlKModal.isOpen) setSearchQuery("")
  }

  useEffect(() => {
    if (ctrlKModal.isOpen) return

    lastSearchQueryRef.current = ""
  }, [ctrlKModal.isOpen])

  useEffect(() => {
    if (!ctrlKModal.isOpen) return

    searchProducts(debouncedSearchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchProducts is redefined every render, never add fns to deps
  }, [ctrlKModal.isOpen, debouncedSearchQuery])

  function createSearchHref(query: string) {
    const params = new URLSearchParams({
      page: "1",
      query,
    })

    return `/${locale}?${params.toString()}`
  }

  function searchProducts(nextQuery: string) {
    const normalizedQuery = nextQuery.trim()

    if (!normalizedQuery || normalizedQuery === lastSearchQueryRef.current) return

    lastSearchQueryRef.current = normalizedQuery
    ctrlKModal.closeModal()
    router.push(createSearchHref(normalizedQuery))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    searchProducts(searchQuery)
  }

  return (
    <ModalContainer
      classnameContainer="z-[1000]"
      className="relative w-full max-w-[450px]"
      isOpen={ctrlKModal.isOpen}
      onClose={ctrlKModal.closeModal}>
      <form className="flex flex-col gap-y-2" onSubmit={handleSubmit}>
        <h1 className="flex justify-center">{t("ctrl_k.title")}</h1>
        <SearchInput
          autoComplete="off"
          startIcon={<BiSearchAlt className="text-icon-color" size={24} />}
          name="searchQuery"
          onChange={event => setSearchQuery(event.currentTarget.value)}
          placeholder={t("ctrl_k.placeholder")}
          type="search"
          value={searchQuery}
        />
      </form>
    </ModalContainer>
  )
}
