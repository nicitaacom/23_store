"use client"

import { useEffect, useState } from "react"

interface ClientOnlyProps {
  children: React.ReactNode
}
//this file needs to prevent hydration error
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    //remove initial page loading skeleton
    document.getElementById("initial-loading")?.remove()
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}

export default ClientOnly
