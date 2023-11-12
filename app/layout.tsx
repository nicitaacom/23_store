import "./globals.css"

import type { Metadata } from "next"

import getOwnerProducts from "./actions/getOwnerProducts"
import getConversationId from "./actions/getConversationId"
import ClientOnly from "./components/ClientOnly"
import { Layout } from "./components"
import { ModalsProvider, ModalsQueryProvider } from "./providers"
import Navbar from "./components/Navbar/Navbar"
import { SupportButton } from "./components/SupportButton"

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
  const conversationId = await getConversationId()
  const initialMessages = await getInitialMessages()

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
          <SupportButton conversationId={conversationId ?? ""} />
        </ClientOnly>
      </body>
    </html>
  )
}
