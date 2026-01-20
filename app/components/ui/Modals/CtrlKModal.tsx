"use client"

import { redirect } from "next/navigation"
import { BiSearchAlt } from "react-icons/bi"
import { SearchInput } from "../Inputs/SearchInput"
import { ModalContainer } from "./ModalContainers/"
import { useCtrlKModal } from "@/store/ui/useCtrlKModal"
import { useScopedI18n } from "@/locales/client"

export function CtrlKModal() {
  const t = useScopedI18n("modal")
  const ctrlKModal = useCtrlKModal()

  function searchProducts(formData: FormData) {
    const searchQuery = formData.get("searchQuery")?.toString()

    ctrlKModal.closeModal()
    if (searchQuery === "") {
      redirect("/")
    }

    if (searchQuery) {
      redirect("/search?query=" + searchQuery)
    }
  }

  return (
    <ModalContainer
      classnameContainer="z-[1000]"
      className="relative w-full max-w-[450px]"
      isOpen={ctrlKModal.isOpen}
      onClose={ctrlKModal.closeModal}>
      <form action={searchProducts} className="flex flex-col gap-y-2">
        <h1 className="flex justify-center">{t("ctrl_k.title")}</h1>
        <SearchInput
          startIcon={<BiSearchAlt className="text-icon-color" size={24} />}
          name="searchQuery"
          placeholder={t("ctrl_k.placeholder")}
        />
      </form>
    </ModalContainer>
  )
}
