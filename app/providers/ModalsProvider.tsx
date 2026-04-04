import React from "react"

import { GlobalImagePreviewPortal } from "@/components/GlobalImagePreviewPortal"
import {
  AreYouSureClearCartModal,
  AreYouSureDeleteProductModal,
  AreYouSureMarkTicketAsCompletedSupportModal,
  CtrlKModal,
  DoYouWantReceiveCheckModal,
  UpdateAvatarModal,
} from "@/components/ui/Modals"

export function ModalsProvider() {
  return (
    <>
      <AreYouSureClearCartModal />
      <AreYouSureDeleteProductModal />
      <AreYouSureMarkTicketAsCompletedSupportModal />
      <CtrlKModal />
      <UpdateAvatarModal />
      <DoYouWantReceiveCheckModal />

      {/* Global images preview */}
      <GlobalImagePreviewPortal />
    </>
  )
}

// don't use this because it throw error (what error?)
// const AreYouSureClearCartModal = dynamic(() => import("@/components/ui/Modals/AreYouSureClearCartModal"), {
//   ssr: false,
// })

// const AreYouSureDeleteProductModal = dynamic(
//   () => import("@/components/ui/Modals/AreYouSureDeleteProductModal").then(modal => modal.AreYouSureDeleteProductModal),
//   { loading: () => <div>Loading AreYouSureDeleteProductModal...</div> },
// )

// const AreYouSureMarkTicketAsCompletedSupportModal = dynamic(
//   () =>
//     import("@/components/ui/Modals/AreYouSureMarkTicketAsCompletedSupportModal").then(
//       modal => modal.AreYouSureMarkTicketAsCompletedSupportModal,
//     ),
//   { loading: () => <div>Loading AreYouSureMarkTicketAsCompletedSupportModal...</div> },
// )

// const CtrlKModal = dynamic(() => import("@/components/ui/Modals/CtrlKModal").then(modal => modal.CtrlKModal), {
//   loading: () => <div>Loading CtrlKModal...</div>,
// })

// const DoYouWantRecieveCheckModal = dynamic(
//   () => import("@/components/ui/Modals/DoYouWantRecieveCheckModal").then(modal => modal.DoYouWantRecieveCheckModal),
//   { loading: () => <div>Loading DoYouWantRecieveCheckModal...</div> },
// )

// return (
//   <>
//     <AreYouSureClearCartModal />
//     {/* <AreYouSureDeleteProductModal />
//     <AreYouSureMarkTicketAsCompletedSupportModal />
//     <CtrlKModal />
//     <DoYouWantRecieveCheckModal /> */}
//   </>
// )
