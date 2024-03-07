"use client"

import { BiSearchAlt } from "react-icons/bi"
import { SearchInput } from "../Inputs/SearchInput"
import { ModalContainer } from "./ModalContainers/"
import { useCtrlKModal } from "@/store/ui/ctrlKModal"
import { redirect } from "next/navigation"

export function CtrlKModal() {
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
        <h1 className="flex justify-center">Search for products</h1>
        <SearchInput
          startIcon={<BiSearchAlt className="text-icon-color" size={24} />}
          name="searchQuery"
          placeholder="Search..."
        />
      </form>
    </ModalContainer>
  )
}
