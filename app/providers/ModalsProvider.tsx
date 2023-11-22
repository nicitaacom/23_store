"use client"

import { useEffect, useState } from "react"

import { CtrlKModal } from "@/components/ui/Modals/CtrlKModal"
import {
  AreYouSureClearCartModal,
  AreYouSureDeleteProductModal,
  AreYouSureMarkTicketAsCompletedSupportModal,
} from "@/components/ui/Modals"

//This provider uses only for modals based on useState
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
      <AreYouSureClearCartModal />
      <AreYouSureDeleteProductModal />
      <AreYouSureMarkTicketAsCompletedSupportModal />
      <CtrlKModal />
    </>
  )
}
