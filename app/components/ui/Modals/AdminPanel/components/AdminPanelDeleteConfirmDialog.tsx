"use client"

import { useRouter } from "next/navigation"
import { BiTrash, BiCheck, BiErrorCircle, BiLoaderAlt } from "react-icons/bi"

import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { twMerge } from "tailwind-merge"

import { AreYouSureModalContainer } from "../../ModalContainers/AreYouSureModalContainer"

type DeleteStatus = "pending" | "deleting" | "done" | "error"

function BulkProgressToast({ items }: { items: { title: string; status: DeleteStatus }[] }) {
  const done = items.filter(i => i.status === "done").length
  const total = items.length
  const progress = Math.round((done / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-subTitle">
        <span>{done} / {total} deleted</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border-color/20">
        <div
          className="h-full rounded-full bg-danger transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="mt-1 max-h-[160px] space-y-1 overflow-y-auto">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {item.status === "done" && <BiCheck size={13} className="shrink-0 text-success" />}
            {item.status === "error" && <BiErrorCircle size={13} className="shrink-0 text-danger" />}
            {item.status === "deleting" && <BiLoaderAlt size={13} className="shrink-0 animate-spin text-subTitle" />}
            {item.status === "pending" && <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-border-color/40" />}
            <span className={twMerge(
              "truncate",
              item.status === "done" && "text-subTitle line-through",
              item.status === "error" && "text-danger",
              item.status === "deleting" && "text-title",
              item.status === "pending" && "text-subTitle/60",
            )}>
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface PendingDeleteProduct {
  id: string
  title: string
}

interface AdminPanelDeleteConfirmDialogProps {
  product: PendingDeleteProduct | PendingDeleteProduct[] | null
  onClose: () => void
}

export function AdminPanelDeleteConfirmDialog({ product, onClose }: AdminPanelDeleteConfirmDialogProps) {
  const router = useRouter()
  const tModal = useScopedI18n("modal")
  const tProduct = useScopedI18n("product")
  const toast = useToast()
  const cartStore = useCartStore()
  const { setIsLoading } = useLoading()

  const products = product ? (Array.isArray(product) ? product : [product]) : []
  const isBulk = Array.isArray(product) && product.length > 1

  async function deleteProducts() {
    if (products.length === 0) return

    setIsLoading(true)
    onClose()

    if (isBulk) {
      const items: { title: string; status: DeleteStatus }[] = products.map(p => ({ title: p.title, status: "pending" }))

      const update = (nextItems: typeof items) =>
        toast.show("warning", `Deleting ${products.length} products…`, <BulkProgressToast items={nextItems} />, null)

      update(items)

      let hasError = false
      for (let i = 0; i < products.length; i++) {
        items[i] = { ...items[i], status: "deleting" }
        update([...items])
        try {
          await productsSDK.deleteProduct({ id: products[i].id })
          useOwnerProductsStore.getState().removeProduct(products[i].id)
          items[i] = { ...items[i], status: "done" }
        } catch {
          items[i] = { ...items[i], status: "error" }
          hasError = true
        }
        update([...items])
      }

      await cartStore.fetchProductsData()
      router.refresh()

      const doneCount = items.filter(i => i.status === "done").length
      if (hasError) {
        toast.show("error", `Deleted ${doneCount} of ${products.length}`, <BulkProgressToast items={items} />, 6000)
      } else {
        toast.show("success", tProduct("product_deleted"), tProduct("product_deleted_subtitle"), 3500)
      }
    } else {
      try {
        await productsSDK.deleteProduct({ id: products[0].id })
        useOwnerProductsStore.getState().removeProduct(products[0].id)
        await cartStore.fetchProductsData()
        router.refresh()
        toast.show("success", tProduct("product_deleted"), tProduct("product_deleted_subtitle"), 3500)
      } catch (error) {
        toast.show("error", tProduct("delete_product_error"), error instanceof Error ? error.message : String(error))
      }
    }

    setIsLoading(false)
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
        products.length > 0 ? (
          <div className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
            {isBulk ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">
                  {products.length} products selected
                </p>
                <ul className="mt-2 space-y-1.5">
                  {products.map(p => (
                    <li key={p.id} className="flex items-center gap-2 text-sm font-semibold leading-5 text-title">
                      <BiTrash size={13} className="shrink-0 text-danger/70" />
                      {p.title}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{tProduct("title")}</p>
                <p className="mt-1 text-base font-semibold leading-6 text-title">{products[0]?.title}</p>
              </>
            )}
          </div>
        ) : null
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProducts}
      primaryButtonLabel={tProduct("delete")}
      secondaryButtonAction={onClose}
      secondaryButtonVariant="default-outline"
      secondaryButtonLabel={tModal("are_you_sure_delete_product.secondary_button")}
    />
  )
}
