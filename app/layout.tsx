import "./globals.css"

import type { Metadata } from "next"

import ClientOnly from "./components/ClientOnly"
import { Layout } from "./components"
import getOwnerProducts from "./actions/getOwnerProducts"
import { ModalsProvider, ModalsQueryProvider } from "./providers"

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
          <ModalsProvider />
          <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
          <Layout>{children}</Layout>
        </ClientOnly>
      </body>
    </html>
  )
}
