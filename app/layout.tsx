import "./globals.css"

import type { Metadata } from "next"

import { Layout } from "./components"
import Navbar from "./components/Navbar/Navbar"
import {
  AdminPanelModalContainer,
  AuthModalContainer,
  CartModalContainer,
  ChangeLanguageModalContainer,
} from "./components/ui/Modals/ModalContainers"
import { AdminPanelModal, AuthModal, CartModal, ChangeLanguageModal } from "./components/ui/Modals"
import ClientOnly from "./components/ClientOnly"
import getOwnerProducts from "./actions/getOwnerProducts"
import { ModalsProvider } from "./providers/ModalsProvider"
import { InitialPageLoadingSkeleton } from "./components/Skeletons/InitialPageLoadingSkeleton"
import { Dispatch, SetStateAction } from "react"

export const metadata: Metadata = {
  title: "23_store",
  description: "Something better than amazon",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logo-light.png",
        href: "/logo-light.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logo-dark.png",
        href: "/logo-dark.png",
      },
    ],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ownerProducts = await getOwnerProducts()
  return (
    <html lang="en">
      <body>
        <ClientOnly>
          <Navbar />
          <Layout>{children}</Layout>
          <ModalsProvider />
          <CartModalContainer>
            <CartModal label="Cart" />
          </CartModalContainer>
          <AuthModalContainer>
            <AuthModal label="Auth" />
          </AuthModalContainer>
          <ChangeLanguageModalContainer>
            <ChangeLanguageModal label="Change language" />
          </ChangeLanguageModalContainer>
          <AdminPanelModalContainer>
            <AdminPanelModal label="Add product" ownerProducts={ownerProducts ?? []} />
          </AdminPanelModalContainer>
        </ClientOnly>
      </body>
    </html>
  )
}
