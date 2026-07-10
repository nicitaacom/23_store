"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

import { TProductDB } from "@/ts/product/TProductDB"
import { useI18n } from "@/locales/client"
import { AdminPanelModalProps } from "@/components/ui/Modals/AdminPanel/AdminPanelModal"
import { AuthModal } from "@/[locale]/(auth)/AuthModal/AuthModal"

type ModalKey = "AdminPanel" | "AuthModal" | "CartModal" | "DbBackup"
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous registry of components with different prop shapes
type ModalEntry = { Component: React.ComponentType<any>; props?: Record<string, unknown> }

function AdminModalLoading() {
  const t = useI18n()

  return <div>{t("modal.loading.admin")}</div>
}

function CartModalLoading() {
  const t = useI18n()

  return <div>{t("modal.loading.cart")}</div>
}

function DbBackupModalLoading() {
  const t = useI18n()

  return <div>{t("modal.loading.backup")}</div>
}

const AdminPanelModal = dynamic<AdminPanelModalProps>(
  () => import("@/components/ui/Modals/AdminPanel/AdminPanelModal").then(module => module.AdminPanelModal),
  { loading: AdminModalLoading },
)

const CartModal = dynamic(() => import("@/components/ui/Modals/CartModal/CartModal").then(module => module.CartModal), {
  loading: CartModalLoading,
})

const DbBackupModal = dynamic(() => import("@/components/ui/Modals/DbBackup/DbBackupModal").then(module => module.DbBackupModal), {
  loading: DbBackupModalLoading,
})

export function ModalsQueryProvider({ ownerProducts, roles, isAuthenticated }: { ownerProducts: TProductDB[]; roles: string[]; isAuthenticated: boolean }) {
  const searchParams = useSearchParams()

  const modalParams = searchParams?.getAll("modal")
  if (!modalParams?.length) return null

  const registry: Partial<Record<ModalKey, ModalEntry>> = {
    AdminPanel: { Component: AdminPanelModal, props: { ownerProducts, roles, isAuthenticated } },
    AuthModal: { Component: AuthModal },
    CartModal: { Component: CartModal },
    DbBackup: { Component: DbBackupModal },
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
