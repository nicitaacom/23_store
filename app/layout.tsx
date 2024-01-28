import "./globals.css"

import type { Metadata } from "next"

import getOwnerProducts from "./actions/getOwnerProducts"
import { ModalsProvider, ModalsQueryProvider } from "./providers"
import { ToastProvider } from "./providers/ToastProvider"
import ClientOnly from "./components/ClientOnly"
import { Layout } from "./components"

import { Inter } from "next/font/google"
const inter = Inter({ subsets: ["latin"] })
import localFont from "next/font/local"
const fireFoxes = localFont({ src: "../public/FireFoxesDemoRegular.ttf", variable: "--font-secondary" })

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
      <body className={(inter.className, fireFoxes.variable)}>
        <ClientOnly>
          <Layout>{children}</Layout>
          <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
          <ModalsProvider />
          <ToastProvider />
        </ClientOnly>
      </body>
    </html>
  )
}
