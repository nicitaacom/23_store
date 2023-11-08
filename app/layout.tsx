import "./globals.css"

import type { Metadata } from "next"

import getOwnerProducts from "./actions/getOwnerProducts"
import { Layout } from "./components"
import ClientOnly from "./components/ClientOnly"
import Navbar from "./components/Navbar/Navbar"
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
          <Layout>
            <Navbar />
            {children}
          </Layout>
          <ModalsProvider />
          <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
        </ClientOnly>
      </body>
    </html>
  )
}
