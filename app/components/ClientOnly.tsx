"use client"

import { useEffect, useState } from "react"
import { InitialPageLoadingSkeleton } from "./Skeletons/InitialPageLoadingSkeleton"

interface ClientOnlyProps {
  children: React.ReactNode
}
//this file needs to prevent hydration error
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <InitialPageLoadingSkeleton />
  }

  return <>{children}</>
}

export default ClientOnly
