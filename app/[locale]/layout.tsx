import "../globals.css"
import "../styles/theme-halloween.css"
import "../styles/theme-new-year.css"
import React, { lazy, Suspense } from "react"
import type { Metadata } from "next"

import { UTMTracker } from "./UTMTracker"
import { getCookie } from "@/utils/helpersSSR"
import getOwnerProducts from "@/actions/getOwnerProducts"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { I18nProviderClient } from "@/locales/client"
import { Layout, OfflineBanner } from "@/components"
import { ModalsProvider, ModalsQueryProvider } from "@/providers"
import { SeasonalThemeLifecycle } from "@/components/SeasonalThemeLifecycle"

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

interface RootLayoutProps {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}

export default async function RootLayout({
  params: paramsPromise,
  children,
}: RootLayoutProps) {
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
  const darkMode = await getCookie("darkMode")

  return (
    <html className={darkMode ?? "dark"} lang={locale} data-theme="default" suppressHydrationWarning>
      <body>
        <SeasonalThemeLifecycle />
        <I18nProviderClient locale={locale}>
          <Layout user={normalizedUser}>{children}</Layout>
          <Suspense>
            <ModalsQueryProvider ownerProducts={getOwnerProductsResp ?? []} roles={roles} isAuthenticated={!!normalizedUser} />
          </Suspense>
          <ModalsProvider />
          <ToastProvider />
          <OfflineBanner />
          <UTMTracker />
        </I18nProviderClient>
      </body>
    </html>
  )
}
