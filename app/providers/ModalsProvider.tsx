import React from "react"
import dynamic from "next/dynamic"

const AreYouSureClearCartModal = dynamic(
  () => import("@/components/ui/Modals/AreYouSureClearCartModal").then(mod => mod.AreYouSureClearCartModal),
  {
    loading: () => <div>Loading AreYouSureClearCartModal...</div>,
  },
)

const AreYouSureDeleteProductModal = dynamic(
  () => import("@/components/ui/Modals/AreYouSureDeleteProductModal").then(modal => modal.AreYouSureDeleteProductModal),
  { loading: () => <div>Loading AreYouSureDeleteProductModal...</div> },
)

const AreYouSureMarkTicketAsCompletedSupportModal = dynamic(
  () =>
    import("@/components/ui/Modals/AreYouSureMarkTicketAsCompletedSupportModal").then(
      modal => modal.AreYouSureMarkTicketAsCompletedSupportModal,
    ),
  { loading: () => <div>Loading AreYouSureMarkTicketAsCompletedSupportModal...</div> },
)

const CtrlKModal = dynamic(() => import("@/components/ui/Modals/CtrlKModal").then(modal => modal.CtrlKModal), {
  loading: () => <div>Loading CtrlKModal...</div>,
})

const DoYouWantRecieveCheckModal = dynamic(
  () => import("@/components/ui/Modals/DoYouWantRecieveCheckModal").then(modal => modal.DoYouWantRecieveCheckModal),
  { loading: () => <div>Loading DoYouWantRecieveCheckModal...</div> },
)

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
