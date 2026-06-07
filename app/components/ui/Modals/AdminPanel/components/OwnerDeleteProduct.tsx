"use client"

import { useState } from "react"
import { TProductDB } from "@/ts/product/TProductDB"
import { useCurrentLocale } from "@/locales/client"
import { pt } from "@/utils/product"
import { OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME, OwnerProductImage } from "./OwnerProductImage"
import { DeleteProductHeader } from "./DeleteProductHeader"
import { twMerge } from "tailwind-merge"
import { AiFillCaretLeft, AiFillCaretRight } from "react-icons/ai"

interface OwnerDeleteProductProps extends TProductDB {
  onRequestDelete: (id: string, title: string) => void
  isBulkMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export function OwnerDeleteProduct({ onRequestDelete, isBulkMode, isSelected, onToggleSelect, ...ownerProduct }: OwnerDeleteProductProps) {
  const locale = useCurrentLocale()
  const translation = pt(ownerProduct, locale)
  const [slideIndex, setSlideIndex] = useState(0)
  const images = ownerProduct.img_url
  const hasMultiple = images.length > 1

  return (
    <article
      className={twMerge(
        "group overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none transition-[border-color,background-color] duration-150",
        !isBulkMode && "hover:border-border-color/50 hover:bg-background/35",
        isBulkMode && "cursor-pointer",
        isBulkMode && isSelected && "border-danger/35 bg-danger/[0.04]",
        isBulkMode && !isSelected && "hover:border-border-color/45 hover:bg-background/20",
      )}
      onClick={isBulkMode ? () => onToggleSelect?.(ownerProduct.id) : undefined}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/35 bg-foreground/[0.02] tablet:border-b-0 tablet:border-r">
          <div className={twMerge(OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME, "relative max-w-none")}>
            <OwnerProductImage
              imgUrl={images[slideIndex]}
              alt={hasMultiple ? `${translation.title} ${slideIndex + 1}` : translation.title}
            />
            {hasMultiple && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setSlideIndex(i => Math.max(0, i - 1)) }}
                  disabled={slideIndex === 0}
                  className="absolute left-0 top-0 z-10 flex h-full w-9 items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-20">
                  <AiFillCaretLeft size={18} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setSlideIndex(i => Math.min(images.length - 1, i + 1)) }}
                  disabled={slideIndex === images.length - 1}
                  className="absolute right-0 top-0 z-10 flex h-full w-9 items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-20">
                  <AiFillCaretRight size={18} />
                </button>
                <span className="absolute bottom-1.5 right-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80 tabular-nums">
                  {slideIndex + 1}/{images.length}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col justify-between px-3 py-3 tablet:px-4 tablet:py-4">
          <DeleteProductHeader
            id={ownerProduct.id}
            title={translation.title}
            description={translation.description}
            price={ownerProduct.price}
            onRequestDelete={onRequestDelete}
            isBulkMode={isBulkMode}
            isSelected={isSelected}
            onToggleSelect={id => onToggleSelect?.(id)}
          />
        </div>
      </div>
    </article>
  )
}
