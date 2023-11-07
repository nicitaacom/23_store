"use client"

import { AreYouSureDeleteProductModal } from "@/components/ui/Modals/AreYouSureDeleteProductModal"
import { useEffect, useState } from "react"

export function ModalsProvider() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* <AreYouSureClearCartModal/> */}
      <AreYouSureDeleteProductModal />
    </>
  )
}
