"use client"

import { useEffect, useState } from "react"
import { InitialPageLoadingSkeleton } from "./Skeletons/InitialPageLoadingSkeleton"
import { useLoading } from "@/store/ui/useLoading"

interface ClientOnlyProps {
  children: React.ReactNode
}
//this file needs to prevent hydration error
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const [hasMountedState, setHasMountedState] = useState(false)
  const { hasCartStoreInitialized } = useLoading() // this loading state required to get cartStore initialize
  // otherwise components will be rendered without result of initialize()

  useEffect(() => {
    setHasMountedState(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!hasMountedState || !hasCartStoreInitialized) {
    return <InitialPageLoadingSkeleton />
  }

  return <>{children}</>
}

export default ClientOnly
