"use client"

import { BiPlus } from "react-icons/bi"

import { useScopedI18n } from "@/locales/client"

interface AddProductVariantButtonProps {
  disabled: boolean
  onClick: () => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function AddProductVariantButton({ disabled, onClick }: AddProductVariantButtonProps) {
  const t = useScopedI18n("product")
  return (
    <button
      className="inline-flex items-center gap-1 rounded border border-border-color/35 bg-background/55 px-2 py-1 text-[11px] font-medium text-icon-color transition-colors duration-150 hover:bg-foreground/50 disabled:opacity-40"
      data-cy="add-variant"
      type="button"
      onClick={onClick}
      disabled={disabled}>
      <BiPlus size={14} /> {t("add_variant_action")}
    </button>
  )
}
