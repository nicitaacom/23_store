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
  const { isLoading } = useLoading()

  const { user } = useUserStore()
  useEffect(() => {
    hydrateOwnerProducts(ownerProducts)
  }, [hydrateOwnerProducts, ownerProducts])

  useEffect(() => {
    if (!user) {
      router.push("/?modal=AuthModal&variant=login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ModalQueryContainer
      hideCloseButton
      className={twMerge(
        "flex flex-col overflow-hidden bg-[#1b1f26]/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300",
        // mobile: true full-screen, no border/radius
        "h-[100dvh] w-screen rounded-none border-0",
        // tablet+: floating, 16:10 ratio, generous width
        "tablet:h-auto tablet:w-[min(96vw,1400px)] tablet:aspect-[16/10] tablet:rounded-[28px] tablet:border tablet:border-white/10",
      )}
      modalQuery="AdminPanel">
      {({ closeModal }) => (
        <>
          <AdminPanelHeader
            title={t("modal.admin_panel.label")}
            activeAction={productAction}
            actionLabels={{ add: t("product.add"), edit: t("product.edit"), delete: t("product.delete") }}
            onActionChange={setProductAction}
            onClose={closeModal}
            disabled={isLoading}
          />

          <div className="relative min-h-0 flex-1 overflow-hidden px-3 py-3 tablet:px-6 tablet:py-5">
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
                <DeleteProductForm ownerProducts={hydratedOwnerProducts} />
              </div>
            )}
          </div>
        </>
      )}
    </ModalQueryContainer>
  )
}
