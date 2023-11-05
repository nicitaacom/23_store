"use client"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModal } from "../AreYouSureModal"
import { BiTrash } from "react-icons/bi"
import { useRouter } from "next/navigation"
import axios from "axios"

export function AreYouSureDeleteProductModal() {
  const router = useRouter()
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()
  const { title, id } = useAreYouSureDeleteProductModal()

  async function deleteProduct() {
    //archive product on stripe first and then in DB
    await axios.post("/api/products/delete", { id: id })

    //close modal and refresh - so user immediately see changes
    areYouSureDeleteProductModal.closeModal()
    router.refresh()
  }

  return (
    <AreYouSureModal
      isOpen={areYouSureDeleteProductModal.isOpen}
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
