import { lazy } from "react"
import { Metadata } from "next"

import Navbar from "@/components/Navbar/Navbar"

const SupportButton = lazy(() => import("@/components/SupportButton/SupportButton"))

export const metadata: Metadata = {
  title: "Joki - products",
  description: "Store better than amazon",
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-16">
      <Navbar />
      {children}
      <SupportButton />
    </div>
  )
}
