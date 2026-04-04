"use client"

import { useRouter } from "next/navigation"
import { BiTrash } from "react-icons/bi"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import useCartStore from "@/store/user/cartStore"
import { useLoading } from "@/store/ui/useLoading"
import { useScopedI18n } from "@/locales/client"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export function AreYouSureDeleteProductModal() {
  const t = useScopedI18n("modal")
  const router = useRouter()
  const cartStore = useCartStore()
  const { setIsLoading } = useLoading()
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()

  async function deleteProduct() {
    setIsLoading(true)
    //archive product on stripe first and then in DB
    const response = await fetch("/api/products/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: areYouSureDeleteProductModal.id }),
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }

    //close modal and refresh - so user immediately see changes
    areYouSureDeleteProductModal.closeModal()
    cartStore.fetchProductsData()
    router.refresh()
    setIsLoading(false)
  }

  return (
    <AreYouSureModalContainer
      isOpen={areYouSureDeleteProductModal.isOpen}
      label={
        <h2>
          {t("are_you_sure_delete_product.label")} <b>{areYouSureDeleteProductModal.title}</b>?
        </h2>
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProduct}
      primaryButtonLabel={t("are_you_sure_delete_product.primary_button")}
      secondaryButtonAction={() => areYouSureDeleteProductModal.closeModal()}
      secondaryButtonLabel={t("are_you_sure_delete_product.secondary_button")}
    />
  )
}
