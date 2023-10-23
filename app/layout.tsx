import "./globals.css"

import type { Metadata } from "next"

import { Layout } from "./components"
import Navbar from "./components/Navbar/Navbar"
import { AuthModalContainer, CartModalContainer } from "./components/ui/Modals/ModalContainers"
import { AuthModal, CartModal } from "./components/ui/Modals"
import ClientOnly from "./components/ClientOnly"

export const metadata: Metadata = {
  title: "23_store",
  description: "Something better than amazon",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="portal" />
        <ClientOnly>
          <Navbar />
          <Layout>{children}</Layout>
          <CartModalContainer>
            <CartModal label="Cart" />
          </CartModalContainer>
          <AuthModalContainer>
            <AuthModal label="Auth" />
          </AuthModalContainer>
        </ClientOnly>
      </body>
    </html>
  )
}
