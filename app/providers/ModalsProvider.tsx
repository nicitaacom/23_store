"use client"

import { useEffect, useState } from "react"

import { CtrlKModal } from "@/components/ui/Modals/CtrlKModal"
import {
  AreYouSureClearCartModal,
  AreYouSureDeleteProductModal,
  AreYouSureMarkTicketAsCompletedSupportModal,
  DoYouWantRecieveCheckModal,
} from "@/components/ui/Modals"

//This provider uses only for modals based on useState
export function ModalsProvider() {
  return (
    <>
      <AreYouSureClearCartModal />
      <AreYouSureDeleteProductModal />
      <AreYouSureMarkTicketAsCompletedSupportModal />
      <CtrlKModal />
      <DoYouWantRecieveCheckModal />
    </>
  )
}
