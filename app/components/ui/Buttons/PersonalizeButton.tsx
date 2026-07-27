"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BsStars } from "react-icons/bs"
import { twMerge } from "tailwind-merge"

import { useScopedI18n } from "@/locales/client"

interface PersonalizeButtonProps {
  productId: string
  variantId?: string | null
  className?: string
}

// http://localhost:6006/?path=/story/commerce-personalize--sharp-upload
export function PersonalizeButton({ productId, variantId, className }: PersonalizeButtonProps) {
  const t = useScopedI18n("personalize")
  const pathname = usePathname()

  const modalQuery = new URLSearchParams({ modal: "PersonalizeModal", productId })
  if (variantId) modalQuery.set("variantId", variantId)

  return (
    <Link
      className={twMerge(
        "inline-flex h-10 w-fit items-center justify-center gap-2 whitespace-nowrap rounded-[4px] border border-brand/40 px-4 text-sm font-semibold text-brand transition-colors duration-150 hover:border-brand hover:bg-brand hover:text-background",
        className,
      )}
      data-cy="personalize-button"
      href={`${pathname ?? "/"}?${modalQuery.toString()}`}
      scroll={false}>
      <BsStars className="text-base" />
      {t("button")}
    </Link>
  )
}
