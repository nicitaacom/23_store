"use client"

import { useParams, usePathname } from "next/navigation"

import { InitialPageLoadingSkeleton } from "./Skeletons/InitialPageLoadingSkeleton"
import { SupportPageLoadingSkeleton } from "./Skeletons/support/SupportPageLoadingSkeleton"
import { useHasMounted } from "@/hooks/useHasMounted"
import { useLoading } from "@/store/ui/useLoading"

interface ClientOnlyProps {
  children: React.ReactNode
}
//this file needs to prevent hydration error
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const hasMountedState = useHasMounted()
  const { hasCartStoreInitialized } = useLoading() // this loading state required to get cartStore initialize
  // otherwise components will be rendered without result of initialize()

  const path = usePathname() || ""
  const ticketId = useParams() || {}
  const isLoading = !hasMountedState || !hasCartStoreInitialized

  if (isLoading && path.includes("support/tickets")) {
    return <SupportPageLoadingSkeleton ticketId={ticketId} />
  }
  if (isLoading) {
    return <InitialPageLoadingSkeleton />
  }

  return <>{children}</>
}

export default ClientOnly
