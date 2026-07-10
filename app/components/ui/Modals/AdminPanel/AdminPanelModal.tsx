"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { AdminPanelDeleteConfirmDialog, IPendingDeleteProduct } from "./components/AdminPanelDeleteConfirmDialog"
import { AddProductForm } from "./components/AddProductForm"
import { AdminPanelHeader, PANEL_ACTIONS, TPanelAction } from "./components/AdminPanelHeader"
import { CategoriesForm } from "./components/CategoriesForm"
import { DeleteProductForm } from "./components/DeleteProductForm"
import { EditProductForm } from "./components/EditProductForm"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"

export interface AdminPanelModalProps {
  ownerProducts: TProductDB[]
  roles: string[]
  isAuthenticated: boolean
}

export function AdminPanelModal({ ownerProducts, roles, isAuthenticated }: AdminPanelModalProps) {
  const t = useI18n()
  const router = useRouter()
  const { products: hydratedOwnerProducts, hydrate: hydrateOwnerProducts } = useOwnerProductsStore()

  const [panelAction, setPanelAction] = useState<TPanelAction>(PANEL_ACTIONS.add)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<IPendingDeleteProduct | IPendingDeleteProduct[] | null>(null)
  const { isLoading } = useLoading()

  useEffect(() => {
    if (hydratedOwnerProducts.length === 0) {
      hydrateOwnerProducts(ownerProducts)
    }
  }, [hydrateOwnerProducts, hydratedOwnerProducts.length, ownerProducts])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      hideCloseButton
      disableDismiss={!!pendingDeleteProduct}
      className={twMerge(
        "flex flex-col overflow-hidden border-border-color/35 bg-modal-surface shadow-compact-lg transition-all duration-300",
        // mobile: true full-screen, no border/radius
        "h-[100dvh] w-screen rounded-none border-0",
        // tablet+: floating dialog, height bounded to the viewport so it never overflows on short screens
        "tablet:h-[88vh] tablet:max-h-[900px] tablet:w-[92vw] tablet:rounded-lg tablet:border",
        // laptop / desktop: cap width so the dialog stays readable on wide screens
        "laptop:w-[min(92vw,1100px)] desktop:w-[min(90vw,1400px)]",
      )}
      ignoreInputs={false}
      modalQuery="AdminPanel">
      {({ closeModal }) => (
        <>
          <AdminPanelHeader
            title={t("modal.admin_panel.label")}
            activeAction={panelAction}
            actionLabels={{
              add: t("product.add"),
              edit: t("product.edit"),
              delete: t("product.delete"),
              categories: t("modal.admin_panel.categories"),
            }}
            onActionChange={setPanelAction}
            onClose={closeModal}
            disabled={isLoading || !!pendingDeleteProduct}
            roles={roles}
          />

          <div className="relative min-h-0 flex-1 overflow-hidden px-2 py-2 tablet:px-3 tablet:py-3">
            {panelAction === PANEL_ACTIONS.add && (
              <div className="h-full">
                <AddProductForm />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.edit && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <EditProductForm ownerProducts={hydratedOwnerProducts} />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.delete && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <DeleteProductForm ownerProducts={hydratedOwnerProducts} onRequestDelete={setPendingDeleteProduct} />
              </div>
            )}
            {panelAction === PANEL_ACTIONS.categories && roles.includes("ADMIN") && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <CategoriesForm />
              </div>
            )}
          </div>

          <AdminPanelDeleteConfirmDialog product={pendingDeleteProduct} onClose={() => setPendingDeleteProduct(null)} />
        </>
      )}
    </ModalQueryContainer>
  )
}
