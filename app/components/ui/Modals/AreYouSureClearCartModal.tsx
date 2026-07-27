"use client"

import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal"
import useCartStore from "@/store/user/cartStore"
import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/ui-overlays-confirmations--clear-cart
export function AreYouSureClearCartModal() {
  const t = useScopedI18n("modal")
  const areYouSuteClearCartModal = useAreYouSureClearCartModal()

  const cartStore = useCartStore()

  function clearCart() {
    cartStore.clearCart()
    areYouSuteClearCartModal.closeModal()
  }

  return (
    <AreYouSureModalContainer
      isOpen={areYouSuteClearCartModal.isOpen}
      label={t("are_you_sure_clear_cart.label")}
      primaryButtonVariant="danger"
      primaryButtonAction={clearCart}
      primaryButtonLabel={t("are_you_sure_clear_cart.primary_button")}
      secondaryButtonAction={areYouSuteClearCartModal.closeModal}
      secondaryButtonLabel={t("are_you_sure_clear_cart.secondary_button")}
    />
  )
}
