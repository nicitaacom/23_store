"use client"

import { useCallback } from "react"
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import useLikedProductsStore from "@/store/user/useLikedProductsStore"
import { useScopedI18n } from "@/locales/client"
import useUser from "@/store/user/useUser"

interface ProductLikeButtonProps {
  productId: string
  categoryId?: string | null
  className?: string
}

export function ProductLikeButton({ productId, categoryId, className }: ProductLikeButtonProps) {
  const t = useScopedI18n("product")
  const { likedProductIds, toggleProductLike } = useLikedProductsStore()
  const { user } = useUser()
  const isLiked = likedProductIds.includes(productId)
  const { addView } = useAnonCategoryViewsStore()

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const delta = isLiked ? -1 : 1
      toggleProductLike(productId)
      void supabaseClient.rpc("increment_product_likes", { p_id: productId, delta })
      if (!isLiked && categoryId) {
        if (user) categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId, delta: 3 }).catch(() => {})
        else addView(categoryId, 3)
      }
    },
    [isLiked, productId, categoryId, user, toggleProductLike],
  ) // don't add fn to deps

  return (
    <button
      type="button"
      aria-label={isLiked ? t("unlike_product") : t("like_product")}
      title={isLiked ? t("unlike_product") : t("like_product")}
      onClick={handleClick}
      className={twMerge(
        "flex h-11 w-11 items-center justify-center rounded-full border border-border-color/20 bg-background/80 text-title shadow-lg shadow-black/15 backdrop-blur-sm transition-all duration-200 hover:border-success/35 hover:bg-success/10",
        className,
      )}>
      {isLiked ? <AiFillHeart className="text-[22px] text-danger" /> : <AiOutlineHeart className="text-[22px] text-title" />}
    </button>
  )
}
