"use client"

import { AuthModal } from "@/(auth)/AuthModal/AuthModal"
import { AdminPanelModalProps } from "@/components/ui/Modals/AdminPanel/AdminPanelModal"
import { CartModalProps } from "@/components/ui/Modals/CartModal/CartModal"
import { ChangeLanguageModalProps } from "@/components/ui/Modals/ChangeLanguageModal"
import { TProductDB } from "@/interfaces/product/TProductDB"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

const AdminPanelModal = dynamic<AdminPanelModalProps>(
  () => import("@/components/ui/Modals/AdminPanel/AdminPanelModal").then(mod => mod.AdminPanelModal),
  { loading: () => <div>Loading for admin modal</div> },
)

const CartModal = dynamic<CartModalProps>(
  () => import("@/components/ui/Modals/CartModal/CartModal").then(mod => mod.CartModal),
  { loading: () => <div>loading for cart modal</div> },
)

const ChangeLanguageModal = dynamic<ChangeLanguageModalProps>(
  () => import("@/components/ui/Modals/ChangeLanguageModal").then(mod => mod.ChangeLanguageModal),
  {
    loading: () => <div>loading for change language modal</div>,
  },
)

export function ModalsQueryProvider({ ownerProducts }: { ownerProducts: TProductDB[] }) {
  const searchParams = useSearchParams()

  const modalParams = searchParams?.getAll("modal")

  if (modalParams) {
    const modalsToRender = modalParams.filter(
      modal => modal === "AdminPanel" || modal === "AuthModal" || modal === "ChangeLanguage" || modal === "CartModal",
    )

    return (
      <>
        {modalsToRender.map(modal => {
          switch (modal) {
            case "AdminPanel":
              return <AdminPanelModal key={modal} label="Admin Panel" ownerProducts={ownerProducts} />
            case "AuthModal":
              return <AuthModal key={modal} label="Auth" />
            case "ChangeLanguage":
              return <ChangeLanguageModal key={modal} label="Change language" />
            case "CartModal":
              return <CartModal key={modal} label="Cart" />
            default:
              return null
          }
        })}
      </>
    )
  }

  return null
}
