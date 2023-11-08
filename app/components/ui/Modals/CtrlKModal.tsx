"use client"

import { BiSearchAlt } from "react-icons/bi"
import { SearchInput } from "../Inputs/SearchInput"
import { ModalContainer } from "./ModalContainers/"
import { useCtrlKModal } from "@/store/ui/ctrlKModal"

export function CtrlKModal() {
  const ctrlKModal = useCtrlKModal()

  return (
    <ModalContainer className="w-full max-w-[450px] py-4" isOpen={ctrlKModal.isOpen} onClose={ctrlKModal.closeModal}>
      <div className="flex flex-col gap-y-2">
        <h1>Search for products</h1>
        <SearchInput
          className="hidden tablet:flex w-[40vw] max-w-[600px]"
          startIcon={<BiSearchAlt size={24} />}
          name="searchQuery"
          placeholder="Search..."
        />
      </div>
    </ModalContainer>
  )
}
