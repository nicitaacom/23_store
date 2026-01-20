import "../globals.css"

import type { Metadata } from "next"
import { lazy, ReactElement } from "react"
import { Layout } from "@/components"
import { ModalsProvider, ModalsQueryProvider } from "@/providers"
import { getCookie } from "@/utils/helpersSSR"
import { I18nProviderClient } from "@/locales/client"
import getOwnerProducts from "@/actions/getOwnerProducts"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_PRODUCTION_URL),
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

export default async function RootLayout({
  params: { locale },
  children,
}: {
  params: { locale: string }
  children: ReactElement
}) {
  const ownerProducts = await getOwnerProducts()
  const ToastProvider = lazy(() => import("@/providers/ToastProvider"))

  return (
    <html lang="en" className={getCookie("darkMode") ?? "dark"}>
      <body>
        <I18nProviderClient locale={locale}>
          <Layout>{children}</Layout>
          <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
          <ModalsProvider />
          <ToastProvider />
        </I18nProviderClient>
      </body>
    </html>
  )
}
