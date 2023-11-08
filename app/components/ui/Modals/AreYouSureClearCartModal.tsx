"use client"

import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import useCartStore from "@/store/user/cartStore"

export function AreYouSureClearCartModal() {
  const areYouSuteClearCartModal = useAreYouSureClearCartModal()

  const cartStore = useCartStore()

  function clearCart() {
    cartStore.clearCart()
    areYouSuteClearCartModal.closeModal()
  }

  return (
    <AreYouSureModalContainer
      isOpen={areYouSuteClearCartModal.isOpen}
      label={"Are you sure you want to clear cart?"}
      primaryButtonVariant="danger"
      primaryButtonAction={clearCart}
      primaryButtonLabel="Delete"
      secondaryButtonAction={areYouSuteClearCartModal.closeModal}
      secondaryButtonLabel="Back"
    />
  )
}
