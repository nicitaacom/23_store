"use client"

import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import { AreYouSureModal } from "../AreYouSureModal"
import useCartStore from "@/store/user/cartStore"

export function AreYouSureClearCartButton() {
  const areYouSuteClearCartModal = useAreYouSureClearCartModal()

  const cartStore = useCartStore()

  return (
    <AreYouSureModal
      isOpen={areYouSuteClearCartModal.isOpen}
      label={<h1>Are you sure you want to clear cart?</h1>}
      primaryButtonVariant="danger"
      primaryButtonAction={cartStore.clearCart}
      primaryButtonLabel="Delete"
      secondaryButtonAction={areYouSuteClearCartModal.closeModal}
      secondaryButtonLabel="Back"></AreYouSureModal>
  )
}
