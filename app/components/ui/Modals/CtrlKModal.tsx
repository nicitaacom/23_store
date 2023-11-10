"use client"

import { BiSearchAlt } from "react-icons/bi"
import { SearchInput } from "../Inputs/SearchInput"
import { ModalContainer } from "./ModalContainers/"
import { useCtrlKModal } from "@/store/ui/ctrlKModal"

export function CtrlKModal() {
  const ctrlKModal = useCtrlKModal()

  return (
    <ModalContainer
      className="relative w-full max-w-[450px]"
      isOpen={ctrlKModal.isOpen}
      onClose={ctrlKModal.closeModal}>
      <div className="flex flex-col gap-y-2">
        <h1 className="flex justify-center">Search for products</h1>
        <SearchInput className="" startIcon={<BiSearchAlt size={24} />} name="searchQuery" placeholder="Search..." />
      </div>
    </ModalContainer>
  )
}
