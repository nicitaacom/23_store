import "../globals.css"
import React, { lazy, Suspense } from "react"
import type { Metadata } from "next"

import { UTMTracker } from "./UTMTracker"
import { getCookie } from "@/utils/helpersSSR"
import getOwnerProducts from "@/actions/getOwnerProducts"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { I18nProviderClient } from "@/locales/client"
import { Layout, OfflineBanner } from "@/components"
import { ModalsProvider, ModalsQueryProvider } from "@/providers"

const ToastProvider = lazy(() => import("@/providers/ToastProvider"))

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
  const getOwnerProductsResp = await getOwnerProducts()

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const normalizedUser = user ?? null
  let roles: string[] = []
  if (normalizedUser?.id) {
    const { data } = await supabase.from("23_users").select("roles").eq("id", normalizedUser.id).single()
    roles = data?.roles ?? []
  }
  const [anonymousId, darkMode] = await Promise.all([getCookie("anonymousId"), getCookie("darkMode")])
  const userId = normalizedUser?.id ?? anonymousId

  return (
    <html className={darkMode ?? "dark"} lang={locale}>
      <body>
        <I18nProviderClient locale={locale}>
          <Layout user={normalizedUser}>{children}</Layout>
          <Suspense>
            <ModalsQueryProvider ownerProducts={getOwnerProductsResp ?? []} roles={roles} isAuthenticated={!!normalizedUser} />
          </Suspense>
          <ModalsProvider />
          <ToastProvider />
          <OfflineBanner />
          <UTMTracker userId={userId} />
        </I18nProviderClient>
      </body>
    </html>
  )
}
