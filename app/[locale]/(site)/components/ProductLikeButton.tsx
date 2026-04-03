"use client"

import { AiFillHeart, AiOutlineHeart } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

import { useScopedI18n } from "@/locales/client"
import useLikedProductsStore from "@/store/user/likedProductsStore"

interface ProductLikeButtonProps {
  productId: string
  className?: string
}

export function ProductLikeButton({ productId, className }: ProductLikeButtonProps) {
  const t = useScopedI18n("product")
  const isLiked = useLikedProductsStore(state => state.likedProductIds.includes(productId))
  const toggleProductLike = useLikedProductsStore(state => state.toggleProductLike)

  return (
    <button
      type="button"
      aria-label={isLiked ? t("unlike_product") : t("like_product")}
      title={isLiked ? t("unlike_product") : t("like_product")}
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        toggleProductLike(productId)
      }}
      className={twMerge(
        "flex h-11 w-11 items-center justify-center rounded-full border border-border-color/20 bg-background/80 text-title shadow-lg shadow-black/15 backdrop-blur-sm transition-all duration-200 hover:border-success/35 hover:bg-success/10",
        className,
      )}>
      {isLiked ? <AiFillHeart className="text-[22px] text-danger" /> : <AiOutlineHeart className="text-[22px] text-title" />}
    </button>
  )
}
