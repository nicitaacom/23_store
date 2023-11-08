"use client"

import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import useCartStore from "@/store/user/cartStore"

export function AreYouSureClearCartButton() {
  const areYouSuteClearCartModal = useAreYouSureClearCartModal()

  const cartStore = useCartStore()

  return (
    <AreYouSureModalContainer
      isOpen={areYouSuteClearCartModal.isOpen}
      label={"Are you sure you want to clear cart?"}
      primaryButtonVariant="danger"
      primaryButtonAction={cartStore.clearCart}
      primaryButtonLabel="Delete"
      secondaryButtonAction={areYouSuteClearCartModal.closeModal}
      secondaryButtonLabel="Back"
    />
  )
}
