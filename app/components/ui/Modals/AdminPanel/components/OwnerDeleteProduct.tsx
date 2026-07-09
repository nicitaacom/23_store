"use client"

import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { OwnerProductImageSlider } from "./OwnerProductImageSlider"
import { DeleteProductHeader } from "./DeleteProductHeader"
import { useLazyVisible } from "@/hooks/ui/useLazyVisible"
import { useCurrentLocale } from "@/locales/client"

interface OwnerDeleteProductProps extends TProductDB {
  onRequestDelete: (id: string, title: string) => void
  isBulkMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export function OwnerDeleteProduct({ onRequestDelete, isBulkMode, isSelected, onToggleSelect, ...ownerProduct }: OwnerDeleteProductProps) {
  const locale = useCurrentLocale()
  const translation = ownerProduct.translations[locale] ?? ownerProduct.translations.fi
  const { ref, isVisible } = useLazyVisible()

  return (
    <div ref={ref}>
    {!isVisible ? (
      <div className="h-32 rounded border border-border-color/35 bg-foreground/55" />
    ) : (
    <article
      className={twMerge(
        "group overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none transition-[border-color,background-color] duration-150",
        isBulkMode && "cursor-pointer",
        isBulkMode && isSelected && "border-danger/35 bg-danger/[0.04]",
        isBulkMode && !isSelected && "hover:border-border-color/45 hover:bg-background/20",
      )}
      onClick={isBulkMode ? () => onToggleSelect?.(ownerProduct.id) : undefined}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/35 bg-foreground/[0.02] tablet:border-b-0 tablet:border-r">
          <OwnerProductImageSlider
            images={ownerProduct.img_url}
            title={translation.title}
            onClickSlide={isBulkMode ? e => e.stopPropagation() : undefined}
          />
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
    )}
    </div>
  )
}
