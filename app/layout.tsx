import "./globals.css"

import type { Metadata } from "next"

import { Layout } from "./components/Layout"
import { Navbar } from "./components/Navbar/Navbar"
import { CartModal } from "./components/ui/Modals"
import { useModals, useToast } from "./store/ui"
import { Toast } from "./components/ui"

export const metadata: Metadata = {
  title: "23 store",
  description: "Something better than amazon",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const toast = useToast()

  const { isOpen, closeModal } = useModals()

  return (
    <html lang="en">
      <body>
        <Navbar />
        <Layout>{children}</Layout>

        {/* MODALS */}
        <CartModal isOpen={isOpen["CartModal"]} onClose={() => closeModal("CartModal")} label="Cart" />
        {toast.isOpen && <Toast />}
      </body>
    </html>
  )
}
