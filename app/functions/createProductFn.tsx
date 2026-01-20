import { ImageListType } from "react-images-uploading"
import axios, { AxiosResponse } from "axios"

import supabaseClient from "@/libs/supabase/supabaseClient"
import { useLoading } from "@/store/ui/useLoading"
import useUserStore from "@/store/user/userStore"
import slugify from "@sindresorhus/slugify"
import { uploadImageFn } from "./uploadImageFn"
import useToast from "@/store/ui/useToast"
import { TProductDB } from "@/ts/product/TProductDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getUserId } from "@/utils/getUserId"

export async function createProductFn(
  t: TI18nFunction,
  title: string,
  subTitle: string,
  price?: number,
  onStock?: number,
  images?: ImageListType,
) {
  const toast = useToast.getState()
  const { setIsLoading } = useLoading.getState()
  const userStore = useUserStore.getState()

  setIsLoading(true)
  try {
    if (!price) {
      try {
        const priceResponse: AxiosResponse<API.AIResponse> = await axios.post("/api/ai", {
          promptValue: `Product: ${title}. Description: ${subTitle}. Estimate realistic USD price. Return ONLY the number.
          PRICING RULES (CRITICAL):
          - T-shirts/Tank tops: $8-15
          - Long sleeve shirts: $12-18
          - Hoodies/Sweatshirts: $20-35
          - Jackets: $30-50
          - Pants/Jeans: $18-35
          - Shorts: $10-20
          - Shoes/Sneakers: $25-60
          - Accessories (hats, bags, etc): $8-25
          - Basic items should be at the LOWER end of the range
          - Premium/special features can go to HIGHER end

          IMPORTANT: Use realistic market prices. T-shirts should be $10-15, NOT $25-30.`,
          memory: "",
        } as API.AIRequest)

        const aiPrice = priceResponse.data.openai
        price = aiPrice ? parseFloat(aiPrice.replace(/[^0-9.]/g, "")) : 9.99

        if (isNaN(price) || price <= 0) price = 9.99
      } catch (error) {
        console.error("Price estimation failed, using default:", error)
        price = 9.99
      }
    }

    const stripeResponse = await axios.post("/api/products/add", {
      title: title,
      subTitle: subTitle,
      price: price,
    })

    if (!stripeResponse.data?.id || !stripeResponse.data?.product) {
      throw new Error(t("product.error.failed_to_create_product_on_stripe"))
    }

    let imagesUrls: string[] = []
    let errorMessages: string[] = []

    if (!images?.length) {
      try {
        const imageResponse = await axios.post(
          "/api/ai/generate-image",
          { prompt: `${title}. ${subTitle}` } as API.GenerateImageRequest,
          { responseType: "arraybuffer" },
        )

        if (imageResponse.status !== 200) {
          throw new Error(`${t("product.error.failed_to_generate_image")} (${imageResponse.status})`)
        }

        const imageFile = new File([imageResponse.data], "generated_image.png", { type: "image/png" })

        const uploadResult = await uploadImageFn({ t, imageFile, bucket: "public-images" })
        if (typeof uploadResult === "string") {
          throw new Error(`Image upload failed: ${uploadResult}`)
        }

        imagesUrls = [uploadResult.publicUrl]
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error("AI image generation failed:", errorMsg) // no need to translate console logs
        throw new Error(`${t("product.error.failed_to_generate_image")}: ${errorMsg}`)
      }
    } else {
      const imagesArray = await Promise.all(
        images.map(async image => {
          if (!image?.file) return

          try {
            const ext = image.file.name.split(".").pop()
            const cleanName = slugify(image.file.name.replace(/\.[^/.]+$/, ""))
            const fileName = `${cleanName}_${stripeResponse.data.id}.${ext}`

            const { data, error } = await supabaseClient.storage
              .from("public-images")
              .upload(`${userStore.userId}/${fileName}`, image.file, { upsert: true })

            if (error) throw new Error(error.message)

            return supabaseClient.storage.from("public-images").getPublicUrl(data.path).data.publicUrl
          } catch (error) {
            errorMessages.push(error instanceof Error ? error.message : String(error))
            return
          }
        }),
      )
      imagesUrls = imagesArray.filter((url): url is string => !!url)
      if (errorMessages.length) throw new Error(`${t("product.error.image_upload_errors")}: ${errorMessages.join(", ")}`)
    }

    if (!imagesUrls.length) {
      throw new Error("No images available for product")
    }

    const userId = getUserId()

    const product: TProductDB = {
      id: stripeResponse.data.product,
      price_id: stripeResponse.data.id,
      owner_id: userId,
      title: title,
      sub_title: subTitle,
      price: price,
      on_stock: onStock,
      img_url: imagesUrls,
    }

    // TODO - check if it will throw because user not authenticated because violates public.users
    const insertResponse = await supabaseClient.from("products").insert(product).eq("user_id", userId)
    if (insertResponse.error) {
      throw new Error(`${t("product.error.db_insert_failed")}: ${insertResponse.error.message}`)
    }

    await axios.post("/api/products/update", {
      productId: stripeResponse.data.product as string,
      images: imagesUrls,
    })

    const url = new URL(window.location.href)
    url.searchParams.delete("modal")
    url.searchParams.delete("variant")

    return product
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("createProductFn error:", errorMessage)
    toast.show("error", "Failed to add product", errorMessage)
    throw new Error(errorMessage)
  } finally {
    setIsLoading(false)
  }
}
