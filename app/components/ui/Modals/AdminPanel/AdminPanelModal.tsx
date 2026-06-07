"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

import useUserStore from "@/store/user/userStore"
import { TProductDB } from "@/ts/product/TProductDB"

import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { EditProductForm } from "./components/EditProductForm"
import { AddProductForm } from "./components/AddProductForm"
import { DeleteProductForm } from "./components/DeleteProductForm"
import { AdminPanelHeader } from "./components/AdminPanelHeader"
import { useLoading } from "@/store/ui/useLoading"
import { useI18n } from "@/locales/client"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { AdminPanelDeleteConfirmDialog, PendingDeleteProduct } from "./components/AdminPanelDeleteConfirmDialog"

export interface AdminPanelModalProps {
  ownerProducts: TProductDB[]
}

const PRODUCT_ACTIONS = {
  add: "add",
  edit: "edit",
  delete: "delete",
} as const

type ProductAction = (typeof PRODUCT_ACTIONS)[keyof typeof PRODUCT_ACTIONS]

export function AdminPanelModal({ ownerProducts }: AdminPanelModalProps) {
  const t = useI18n()
  const router = useRouter()
  const { products: hydratedOwnerProducts, hydrate: hydrateOwnerProducts } = useOwnerProductsStore()

  const [productAction, setProductAction] = useState<ProductAction>(PRODUCT_ACTIONS.add)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<PendingDeleteProduct | PendingDeleteProduct[] | null>(null)
  const { isLoading } = useLoading()

  const { user } = useUserStore()
  useEffect(() => {
    if (hydratedOwnerProducts.length === 0) {
      hydrateOwnerProducts(ownerProducts)
    }
  }, [hydrateOwnerProducts, hydratedOwnerProducts.length, ownerProducts])

  useEffect(() => {
    if (!user) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      hideCloseButton
      disableDismiss={!!pendingDeleteProduct}
      className={twMerge(
        "flex flex-col overflow-hidden border-border-color/35 bg-background shadow-compact-lg transition-all duration-300",
        // mobile: true full-screen, no border/radius
        "h-[100dvh] w-screen rounded-none border-0",
        // tablet+: floating, 16:10 ratio, generous width
        "tablet:h-auto tablet:w-[min(96vw,1400px)] tablet:aspect-[16/10] tablet:rounded-lg tablet:border",
      )}
      ignoreInputs={false}
      modalQuery="AdminPanel">
      {({ closeModal }) => (
        <>
          <AdminPanelHeader
            title={t("modal.admin_panel.label")}
            activeAction={productAction}
            actionLabels={{ add: t("product.add"), edit: t("product.edit"), delete: t("product.delete") }}
            onActionChange={setProductAction}
            onClose={closeModal}
            disabled={isLoading || !!pendingDeleteProduct}
          />

          <div className="relative min-h-0 flex-1 overflow-hidden px-2 py-2 tablet:px-3 tablet:py-3">
            {productAction === PRODUCT_ACTIONS.add && (
              <div className="h-full">
                <AddProductForm />
              </div>
            )}
            {productAction === PRODUCT_ACTIONS.edit && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <EditProductForm ownerProducts={hydratedOwnerProducts} />
              </div>
            )}
            {productAction === PRODUCT_ACTIONS.delete && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <DeleteProductForm
                  ownerProducts={hydratedOwnerProducts}
                  onRequestDelete={setPendingDeleteProduct}
                />
              </div>
            )}
          </div>

          <AdminPanelDeleteConfirmDialog product={pendingDeleteProduct} onClose={() => setPendingDeleteProduct(null)} />
        </>
      )}
    </ModalQueryContainer>
  )
}
