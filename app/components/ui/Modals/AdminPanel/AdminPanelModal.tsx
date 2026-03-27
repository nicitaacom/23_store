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

  const [productAction, setProductAction] = useState<ProductAction>(PRODUCT_ACTIONS.add)
  const { isLoading } = useLoading()

  const { user } = useUserStore()
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
        `flex h-[min(92vh,960px)] w-[calc(100vw-20px)] flex-col overflow-hidden rounded-[28px]
        border border-white/10 bg-[#1b1f26]/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300`,
        "tablet:w-[min(94vw,1180px)] laptop:h-auto laptop:aspect-[16/9]",
      )}
      modalQuery="AdminPanel">
      {({ closeModal }) => (
        <>
          <AdminPanelHeader
            title={t("modal.admin_panel.label")}
            activeAction={productAction}
            actionLabels={{
              add: t("product.add"),
              edit: t("product.edit"),
              delete: t("product.delete"),
            }}
            onActionChange={setProductAction}
            onClose={closeModal}
            disabled={isLoading}
          />

          <div className="relative min-h-0 flex-1 px-4 py-4 tablet:px-6 tablet:py-5">
            {productAction === PRODUCT_ACTIONS.add && (
              <div className="h-full">
                <AddProductForm />
              </div>
            )}

            {productAction === PRODUCT_ACTIONS.edit && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <EditProductForm ownerProducts={ownerProducts} />
              </div>
            )}

            {productAction === PRODUCT_ACTIONS.delete && (
              <div className="panel-scroll h-full overflow-y-auto pr-1">
                <DeleteProductForm ownerProducts={ownerProducts} />
              </div>
            )}
          </div>
        </>
      )}
    </ModalQueryContainer>
  )
}
