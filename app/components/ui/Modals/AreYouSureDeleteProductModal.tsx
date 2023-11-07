"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BiTrash } from "react-icons/bi"
import axios from "axios"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModalContainer } from "./ModalContainers/AreYouSureModalContainer"
import useCartStore from "@/store/user/cartStore"

export function AreYouSureDeleteProductModal() {
  const router = useRouter()
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()
  const cartStore = useCartStore()
  const { title, id } = useAreYouSureDeleteProductModal()
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsLoading(true)
  }, [])
  // to prevent SSR because if I render this modal I trigger useEffect
  // that trigger document.addEventListener on esc (I need close ctrlK modal on esc press)
  if (!isMounted) {
    return null
  }

  async function deleteProduct() {
    setIsLoading(true)
    //archive product on stripe first and then in DB
    await axios.post("/api/products/delete", { id: id })

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
          Are you sure you want delete <b>{title}</b>?
        </h2>
      }
      primaryButtonIcon={BiTrash}
      primaryButtonVariant="danger"
      primaryButtonAction={deleteProduct}
      primaryButtonLabel="Delete"
      secondaryButtonAction={areYouSureDeleteProductModal.closeModal}
      secondaryButtonLabel="Back"
    />
  )
}
