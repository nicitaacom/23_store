import "./globals.css"

import type { Metadata } from "next"

import getOwnerProducts from "./actions/getOwnerProducts"
import { ModalsProvider, ModalsQueryProvider } from "./providers"
import { getCookie } from "./utils/helpersSSR"
import { lazy } from "react"
import { Layout } from "./components"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PRODUCTION_URL),
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
  const ToastProvider = lazy(() => import("./providers/ToastProvider"))

  return (
    <html lang="en" className={getCookie("darkMode") ?? "dark"}>
      <body>
        <Layout>{children}</Layout>
        <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
        <ModalsProvider />
        <ToastProvider />
      </body>
    </html>
  )
}
