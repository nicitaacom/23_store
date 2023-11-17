import getOwnerProducts from "@/actions/getOwnerProducts"
import Navbar from "@/components/Navbar/Navbar"
import { ModalsProvider, ModalsQueryProvider } from "@/providers"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "23_store - products",
  description: "Store better than amazon",
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const ownerProducts = await getOwnerProducts()

  return (
    <div>
      <ModalsProvider />
      <ModalsQueryProvider ownerProducts={ownerProducts ?? []} />
      <Navbar />
      {children}
    </div>
  )
}
