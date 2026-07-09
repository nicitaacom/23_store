"use client"

import { FiEdit3 } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import useUserStore from "@/store/user/userStore"
import { Button } from "@/components/ui"

type ManageProductButtonProps = {
  productId: string
  ownerId: string
  size?: "xs" | "sm" | "md"
  className?: string
}

const iconClassNameBySize: Record<NonNullable<ManageProductButtonProps["size"]>, string> = {
  xs: "text-xs text-warning",
  sm: "text-sm text-warning",
  md: "text-base text-warning",
}

export function ManageProductButton({
  productId,
  ownerId,
  size = "md",
  className,
}: ManageProductButtonProps) {
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")
  const { user } = useUserStore()

  if (user?.id !== ownerId) {
    return null
  }

  return (
    <Button
      className={twMerge(
        "w-full border border-white/8 bg-[#000000] text-title hover:border-warning/25 hover:bg-[#111111] hover:text-title mobile:w-fit font-medium",
        className,
      )}
      href={`/${locale}/products/${productId}/manage`}
      variant="ghost"
      size={size}
      rounded="sm"
      shadow="sm"
      rightIcon={<FiEdit3 className={iconClassNameBySize[size]} />}>
      {t("manage_product")}
    </Button>
  )
}
