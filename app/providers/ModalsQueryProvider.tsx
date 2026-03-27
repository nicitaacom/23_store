"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { AuthModal } from "@/[locale]/(auth)/AuthModal/AuthModal"
import { useI18n } from "@/locales/client"
import { TProductDB } from "@/ts/product/TProductDB"
import { AdminPanelModalProps } from "@/components/ui/Modals/AdminPanel/AdminPanelModal"

type ModalKey = "AdminPanel" | "AuthModal" | "CartModal"
type ModalEntry = { Component: React.ComponentType<any>; props?: Record<string, unknown> }

function AdminModalLoading() {
  const t = useI18n()

  return <div>{t("modal.loading.admin")}</div>
}

function CartModalLoading() {
  const t = useI18n()

  return <div>{t("modal.loading.cart")}</div>
}

const AdminPanelModal = dynamic<AdminPanelModalProps>(
  () => import("@/components/ui/Modals/AdminPanel/AdminPanelModal").then(m => m.AdminPanelModal),
  { loading: AdminModalLoading },
)

const CartModal = dynamic(() => import("@/components/ui/Modals/CartModal/CartModal").then(m => m.CartModal), {
  loading: CartModalLoading,
})

export function ModalsQueryProvider({ ownerProducts }: { ownerProducts: TProductDB[] }) {
  const searchParams = useSearchParams()

  const modalParams = searchParams?.getAll("modal")
  if (!modalParams?.length) return null

  const registry: Partial<Record<ModalKey, ModalEntry>> = {
    AdminPanel: { Component: AdminPanelModal, props: { ownerProducts } },
    AuthModal: { Component: AuthModal },
    CartModal: { Component: CartModal },
  }

  return (
    <>
      {modalParams.map(modal => {
        const entry = registry[modal as ModalKey]
        if (!entry) return null

        const { Component, props } = entry
        return <Component key={modal} {...props} />
      })}
    </>
  )
}
