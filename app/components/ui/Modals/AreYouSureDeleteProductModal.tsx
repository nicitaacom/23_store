"use client"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModal } from "../AreYouSureModal"
import supabaseClient from "@/libs/supabaseClient"
import { BiTrash } from "react-icons/bi"
import { useRouter } from "next/navigation"
import useUserStore from "@/store/user/userStore"

export function AreYouSureDeleteProductModal() {
  const router = useRouter()
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()
  const { title, id } = useAreYouSureDeleteProductModal()
  const { userId } = useUserStore()

  async function deleteProduct() {
    //delete product from bucket
    const { error: deleteFromBucketError } = await supabaseClient.storage.from("public").remove([`${userId}/${id}`])
    //delte product from 'products' table
    const { error: deleteError } = await supabaseClient.from("products").delete().eq("id", id)
    if (deleteError) throw deleteError

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
