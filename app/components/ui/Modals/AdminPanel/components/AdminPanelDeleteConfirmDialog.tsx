"use client"

import { useRouter } from "next/navigation"
import { BiTrash } from "react-icons/bi"

import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { twMerge } from "tailwind-merge"

import { AreYouSureModalContainer } from "../../ModalContainers/AreYouSureModalContainer"

export interface PendingDeleteProduct {
  id: string
  title: string
}

interface AdminPanelDeleteConfirmDialogProps {
  product: PendingDeleteProduct | null
  onClose: () => void
}

export function AdminPanelDeleteConfirmDialog({ product, onClose }: AdminPanelDeleteConfirmDialogProps) {
  const router = useRouter()
  const tModal = useScopedI18n("modal")
  const tProduct = useScopedI18n("product")
  const toast = useToast()
  const cartStore = useCartStore()
  const { setIsLoading } = useLoading()

  async function deleteProduct() {
    if (!product) return

    setIsLoading(true)
    try {
      await productsSDK.deleteProduct({ id: product.id })
      useOwnerProductsStore.getState().removeProduct(product.id)
      await cartStore.fetchProductsData()
      router.refresh()
      toast.show("success", tProduct("product_deleted"), tProduct("product_deleted_subtitle"), 3500)
      onClose()
    } catch (error) {
      toast.show("error", tProduct("delete_product_error"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AreYouSureModalContainer
      className="w-[min(calc(100vw-2rem),520px)]"
      contentClassName="gap-4 px-4 pb-4 pt-4 tablet:px-5"
      titleClassName="gap-3"
      subTitleClassName="space-y-3"
      actionsClassName="pt-1"
      primaryButtonClassName="w-full tablet:w-auto"
      secondaryButtonClassName="w-full tablet:w-auto"
      primaryButtonSize="md"
      secondaryButtonSize="md"
      isOpen={!!product}
      label={
        <div className="space-y-3">
          <span
            className={twMerge(
              "inline-flex items-center gap-1 rounded border border-border-color/30 bg-background/55 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-subTitle",
              "border-danger/25 bg-danger/10 text-danger",
            )}>
            <BiTrash size={14} />
            {tProduct("delete")}
          </span>
          <div className="space-y-1.5">
            <h2 className="max-w-[18ch] font-secondary text-[24px] font-bold leading-[1.08] text-title">
              {tProduct("confirm_delete_product")}
            </h2>
            <p className="max-w-[40ch] text-sm leading-5 text-subTitle">{tModal("are_you_sure_delete_product.subtitle")}</p>
          </div>
        </div>
      }
      subTitle={
        product ? (
          <div className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{tProduct("title")}</p>
            <p className="mt-1 text-base font-semibold leading-6 text-title">{product.title}</p>
          </div>
        ) : null
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProduct}
      primaryButtonLabel={tProduct("delete")}
      secondaryButtonAction={onClose}
      secondaryButtonVariant="default-outline"
      secondaryButtonLabel={tModal("are_you_sure_delete_product.secondary_button")}
    />
  )
}
