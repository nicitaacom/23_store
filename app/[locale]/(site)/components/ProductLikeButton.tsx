"use client"

import { AiFillHeart, AiOutlineHeart } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

import { useScopedI18n } from "@/locales/client"
import useLikedProductsStore from "@/store/user/likedProductsStore"
import useUserStore from "@/store/user/userStore"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { categoryViewsSDK } from "@/sdk/CategoryViewsSDK/CategoryViewsSDK"

const ANON_VIEWS_KEY = "23_category_views_anon"

interface ProductLikeButtonProps {
  productId: string
  categoryId?: string | null
  className?: string
}

export function ProductLikeButton({ productId, categoryId, className }: ProductLikeButtonProps) {
  const t = useScopedI18n("product")
  const { likedProductIds, toggleProductLike } = useLikedProductsStore()
  const { user } = useUserStore()
  const isLiked = likedProductIds.includes(productId)

  return (
    <button
      type="button"
      aria-label={isLiked ? t("unlike_product") : t("like_product")}
      title={isLiked ? t("unlike_product") : t("like_product")}
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        const delta = isLiked ? -1 : 1
        toggleProductLike(productId)
        void supabaseClient.rpc("increment_product_likes", { p_id: productId, delta })
        // Record category preference on like (not unlike), delta 3
        if (!isLiked && categoryId) {
          if (user) {
            categoryViewsSDK.incrementDBCategoryView({ category_id: categoryId, delta: 3 }).catch(() => {})
          } else {
            try {
              const raw = localStorage.getItem(ANON_VIEWS_KEY)
              const existing: Record<string, number> = raw ? JSON.parse(raw) : {}
              existing[categoryId] = (existing[categoryId] ?? 0) + 3
              localStorage.setItem(ANON_VIEWS_KEY, JSON.stringify(existing))
            } catch { /* ignore */ }
          }
        }
      }}
      className={twMerge(
        "flex h-11 w-11 items-center justify-center rounded-full border border-border-color/20 bg-background/80 text-title shadow-lg shadow-black/15 backdrop-blur-sm transition-all duration-200 hover:border-success/35 hover:bg-success/10",
        className,
      )}>
      {isLiked ? <AiFillHeart className="text-[22px] text-danger" /> : <AiOutlineHeart className="text-[22px] text-title" />}
    </button>
  )
}
