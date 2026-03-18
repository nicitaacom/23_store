"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { CiEdit } from "react-icons/ci"
import { AiOutlinePlus } from "react-icons/ai"
import { MdOutlineDelete } from "react-icons/md"

import { RadioButton } from "@/components/ui"
import useUserStore from "@/store/user/userStore"
import { TProductDB } from "@/ts/product/TProductDB"

import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { EditProductForm } from "./components/EditProductForm"
import { AddProductForm } from "./components/AddProductForm"
import { DeleteProductForm } from "./components/DeleteProductForm"
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
      className={twMerge(
        `flex w-[calc(100vw-24px)] max-h-[min(92vh,960px)] flex-col overflow-hidden border border-border-color/70
        bg-foreground shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition-all duration-300`,
        productAction === PRODUCT_ACTIONS.add && "max-w-[680px]",
        productAction !== PRODUCT_ACTIONS.add && "max-w-[1200px]",
      )}
      modalQuery="AdminPanel">
      <div className="border-b border-border-color/70 px-4 pb-4 pt-5 tablet:px-6 tablet:pb-5">
        <div className="pr-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-subTitle">Workspace</p>
          <h1 className="text-2xl font-semibold leading-tight tablet:text-[30px]">{t("modal.admin_panel.label")}</h1>
          <p className="mt-1 text-sm text-subTitle">Manage products with fewer clicks and cleaner inline editing.</p>
        </div>
      </div>
      <div className="border-b border-border-color/70 px-4 py-4 tablet:px-6">
        <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
        <li>
          <RadioButton
            label={PRODUCT_ACTIONS.add}
            inputName="product"
            onChange={e => setProductAction(e.target.value as ProductAction)}
            disabled={isLoading}
            defaultChecked>
            <div className="flex flex-row gap-x-2 items-center">
              {t("product.add")} <AiOutlinePlus className="text-success" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton
            label={PRODUCT_ACTIONS.edit}
            inputName="product"
            onChange={e => setProductAction(e.target.value as ProductAction)}
            disabled={isLoading}>
            <div className="flex flex-row gap-x-2 items-center">
              {t("product.edit")} <CiEdit className="text-warning" />
            </div>
          </RadioButton>
        </li>
        <li>
          <RadioButton
            label={PRODUCT_ACTIONS.delete}
            inputName="product"
            onChange={e => setProductAction(e.target.value as ProductAction)}
            disabled={isLoading}>
            <div className="flex flex-row gap-x-2 items-center">
              {t("product.delete")} <MdOutlineDelete className="text-danger" />
            </div>
          </RadioButton>
        </li>
        </ul>
      </div>
      <div className={twMerge(`relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4 tablet:px-6 tablet:py-5`)}>
        {/* ADD PRODUCT */}

        {productAction === PRODUCT_ACTIONS.add && <AddProductForm />}

        {/* EDIT PRODUCT */}

        {productAction === PRODUCT_ACTIONS.edit && <EditProductForm ownerProducts={ownerProducts} />}

        {/* DELETE PRODUCT */}

        {productAction === PRODUCT_ACTIONS.delete && <DeleteProductForm ownerProducts={ownerProducts} />}
      </div>
    </ModalQueryContainer>
  )
}
