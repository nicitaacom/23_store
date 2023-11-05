"use client"

import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { AreYouSureModal } from "../AreYouSureModal"
import supabaseClient from "@/libs/supabaseClient"
import { BiTrash } from "react-icons/bi"
import { useRouter } from "next/navigation"

export function AreYouSureDeleteProductModal() {
  const router = useRouter()
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()
  const { title, id } = useAreYouSureDeleteProductModal()

  async function deleteProduct() {
    //delete product from bucket
    const { data, error } = await supabaseClient.from("products").select("img_url").eq("id", id).single()

    if (data?.img_url) {
      //get all the parts after the last occurrence of the second part of the URL
      const imageUrls = data.img_url.map(url => {
        const parts = url.split("/")
        const lastTwoParts = parts.slice(-2).join("/")
        return lastTwoParts
      })
      console.log(27, "imageUrls - ", imageUrls)
      const { error: deleteFromBucketError } = await supabaseClient.storage.from("public").remove(imageUrls)
      if (deleteFromBucketError) throw deleteFromBucketError
    } else {
      console.log("No image URLs found.")
    }
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
