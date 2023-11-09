"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BiTrash } from "react-icons/bi"
import axios from "axios"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import useCartStore from "@/store/user/cartStore"

export function AreYouSureDeleteProductModal() {
  const router = useRouter()
  const cartStore = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()

  async function deleteProduct() {
    setIsLoading(true)
    //archive product on stripe first and then in DB
    await axios.post("/api/products/delete", { id: areYouSureDeleteProductModal.id })

    //close modal and refresh - so user immediately see changes
    areYouSureDeleteProductModal.closeModal()
    cartStore.fetchProductsData()
    router.refresh()
    setIsLoading(false)
  }

  return (
    <AreYouSureModalContainer
      isOpen={areYouSureDeleteProductModal.isOpen}
      isLoading={isLoading}
      label={
        <h2>
          Are you sure you want delete <b>{areYouSureDeleteProductModal.title}</b>?
        </h2>
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProduct}
      primaryButtonLabel="Delete"
      secondaryButtonAction={() => areYouSureDeleteProductModal.closeModal()}
      secondaryButtonLabel="Back"
    />
  )
}
