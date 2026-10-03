"use client"

import { BiPlus } from "react-icons/bi"
import { FaPlus } from "react-icons/fa"

import { openModalOnCurrentPage } from "@/utils/modalQuery"

interface CatalogAddProductButtonProps {
  isAuthenticated: boolean
  label: string
}

// http://localhost:6006/?path=/story/commerce-catalog--add-product-button
export function CatalogAddProductButton({ isAuthenticated, label }: CatalogAddProductButtonProps) {
  return (
    <button
      className="inline-flex h-10 w-fit items-center justify-center gap-2 whitespace-nowrap rounded-[4px] border border-success/30 px-4 py-3 text-sm font-semibold text-success transition-colors duration-150 hover:border-success hover:bg-success hover:text-background mobile:text-base max-[480px]:flex-1 max-[480px]:gap-0 max-[480px]:px-0 max-[480px]:py-0"
      type="button"
      aria-label={label}
      onClick={() => openModalOnCurrentPage(isAuthenticated ? "AdminPanel" : "AuthModal", isAuthenticated ? undefined : "login")}>
      <BiPlus className="hidden text-xl max-[480px]:block" />
      <FaPlus className="hidden text-sm min-[481px]:block" />
      <span className="text-inherit max-[480px]:hidden">{label}</span>
    </button>
  )
}
