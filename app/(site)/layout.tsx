import { lazy } from "react"
import { Metadata } from "next"

import Navbar from "@/components/Navbar/Navbar"

export const metadata: Metadata = {
  title: "23_store - products",
  description: "Store better than amazon",
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const SupportButton = lazy(() => import("@/components/SupportButton/SupportButton"))

  return (
    <div>
      <Navbar />
      {children}
      <SupportButton />
    </div>
  )
}
