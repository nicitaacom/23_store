import React from "react"

const AreYouSureClearCartModal = async () => {
  const modal = import("@/components/ui/Modals/AreYouSureClearCartModal")
  const { AreYouSureClearCartModal } = await modal
  return <AreYouSureClearCartModal />
}
const AreYouSureDeleteProductModal = async () => {
  const modal = import("@/components/ui/Modals/AreYouSureDeleteProductModal")
  const { AreYouSureDeleteProductModal } = await modal
  return <AreYouSureDeleteProductModal />
}
const AreYouSureMarkTicketAsCompletedSupportModal = async () => {
  const modal = import("@/components/ui/Modals/AreYouSureMarkTicketAsCompletedSupportModal")
  const { AreYouSureMarkTicketAsCompletedSupportModal } = await modal
  return <AreYouSureMarkTicketAsCompletedSupportModal />
}

const CtrlKModal = async () => {
  const modal = import("@/components/ui/Modals/CtrlKModal")
  const { CtrlKModal } = await modal
  return <CtrlKModal />
}

const DoYouWantRecieveCheckModal = async () => {
  const modal = import("@/components/ui/Modals/DoYouWantRecieveCheckModal")
  const { DoYouWantRecieveCheckModal } = await modal
  return <DoYouWantRecieveCheckModal />
}

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

// don't use this because it throw error
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
