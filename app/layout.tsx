import "./globals.css"

import type { Metadata } from "next"

import getOwnerProducts from "./actions/getOwnerProducts"
import { ModalsProvider, ModalsQueryProvider } from "./providers"
import { getCookie } from "./utils/helpersSSR"
import { lazy } from "react"

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
  // "use server"
  // const anonymousId = await getCookie("anonymousId")
  // if (!anonymousId) {
  //   cookies().set("anonymousId", `anonymousId_${crypto.randomUUID()}`)
  // }

  const ownerProducts = await getOwnerProducts()
  const ToastProvider = lazy(() => import("./providers/ToastProvider"))

  return (
    <html lang="en" className={getCookie("darkMode")}>
      <body>
        {children}
        <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
        <ModalsProvider />
        <ToastProvider />
      </body>
    </html>
  )
}
