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
import { getAnonymousId } from "./getAnonymousId"

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
  let priceLet: number | undefined = price
  try {
    if (!price) {
      try {
        const response = await fetch("/api/fetch-prices", {
          method: "POST",
          body: JSON.stringify({ title, subTitle }),
          headers: { "Content-Type": "application/json" },
        })
        const data = await response.json()
        console.log(39, "fetch-prices response:", data)

        if (data.price && data.price > 0) {
          priceLet = data.price
        } else {
          const priceResponse = await axios.post("/api/ai/", {
            promptValue: `
Product: ${title}.
Description: ${subTitle}.
Estimate realistic USD price ONLY the number.
RULES:
- tiny adapters/connectors: realistic $1–$6
- basic 12V accessory: realistic $4–$15
- do NOT go above these ranges
      `,
            memory: "",
          })

          const aiRaw = priceResponse.data.openai || ""
          const parsed = parseFloat(aiRaw.replace(/[^0-9.]/g, "")) || 0
          price = parsed > 0 ? parsed : 4.99
        }
      } catch (err) {
        console.error("Price estimation failed, fallback to default 4.99:", err)
        price = 4.99
      }
    }

    // convert to Stripe integer cents
    if (!priceLet) throw Error("Price is not defined")

    const stripeAmount = Math.max(1, Math.floor(priceLet * 100))

    const stripeResponse = await axios.post("/api/products/add", {
      title,
      subTitle,
      price: stripeAmount, // in cents
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
              .upload(`${userStore.user?.id || getAnonymousId() || getUserId()}/${fileName}`, image.file, { upsert: true })

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
      price: priceLet,
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
