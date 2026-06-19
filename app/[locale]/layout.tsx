import "../globals.css"

import type { Metadata } from "next"
import React, { lazy } from "react"
import { Layout } from "@/components"
import { ModalsProvider, ModalsQueryProvider } from "@/providers"
import { getCookie } from "@/utils/helpersSSR"
import { I18nProviderClient } from "@/locales/client"
import getOwnerProducts from "@/actions/getOwnerProducts"
import { UTMTracker } from "@/[locale]/(site)/stats/UTMTracker"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { normalizeUser } from "@/utils/user"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_PRODUCTION_URL : "http://localhost:3023"),
  title: "Joki ",
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
  params: paramsPromise,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  const { locale } = await paramsPromise
  const ownerProducts = await getOwnerProducts()
  const ToastProvider = lazy(() => import("@/providers/ToastProvider"))

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const normalizedUser = normalizeUser(user)
  const [anonymousId, darkMode] = await Promise.all([getCookie("anonymousId"), getCookie("darkMode")])
  const userId = normalizedUser?.id ?? anonymousId

  return (
    <html lang="en" className={darkMode ?? "dark"}>
      <body>
        <I18nProviderClient locale={locale}>
          <Layout user={normalizedUser}>{children}</Layout>
          <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
          <ModalsProvider />
          <ToastProvider />
          <UTMTracker userId={userId} />
        </I18nProviderClient>
      </body>
    </html>
  )
}
