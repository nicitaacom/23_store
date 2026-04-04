import { ImageListType } from "react-images-uploading"
import axios, { AxiosResponse } from "axios"

import supabaseClient from "@/libs/supabase/supabaseClient"
import { useLoading } from "@/store/ui/useLoading"
import useUserStore from "@/store/user/userStore"
import slugify from "@sindresorhus/slugify"
import { uploadImageFn } from "./uploadImageFn"
import { ProductTranslations, TProductDB } from "@/ts/product/TProductDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getUserId } from "@/utils/getUserId"
import { getAnonymousId } from "./getAnonymousId"
import { TProductVariant, TProductVariantDraft } from "@/ts/product/TProductVariant"
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"
import { normalizeProductTranslations } from "@/utils/product"

type CreateProductFnInput = {
  title: string
  description: string
  price?: number
  onStock?: number
  images?: ImageListType
  variants?: TProductVariantDraft[]
  translations?: ProductTranslations
  manageLoading?: boolean
}

function getFileExtensionFromContentType(contentType: string, fallbackFileName: string) {
  const contentTypeToExtension: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }

  return contentTypeToExtension[contentType] || fallbackFileName.split(".").pop() || "jpg"
}

async function compressImageWithTinify(imageFile: File) {
  const formData = new FormData()
  formData.append("image", imageFile)

  const response = await fetch("/api/tinify", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = errorText || `Tinify request failed (${response.status})`

    try {
      const parsedError = JSON.parse(errorText) as { error?: string }
      errorMessage = parsedError.error || errorMessage
    } catch {}

    throw new Error(errorMessage)
  }

  const compressedBlob = await response.blob()
  const contentType = response.headers.get("Content-Type") || compressedBlob.type || imageFile.type || "image/jpeg"
  const baseName = imageFile.name.replace(/\.[^/.]+$/, "")
  const fileExtension = getFileExtensionFromContentType(contentType, imageFile.name)

  return new File([compressedBlob], `${baseName}.${fileExtension}`, { type: contentType })
}

async function resolveProductTranslations(title: string, description: string, translations?: ProductTranslations) {
  if (translations) {
    return normalizeProductTranslations(translations)
  }

  const response = await axios.post("/api/translate-product", {
    title,
    description,
  })

  return normalizeProductTranslations(response.data)
}

export async function createProductFn(t: TI18nFunction, input: CreateProductFnInput) {
  const { setIsLoading } = useLoading.getState()
  const userStore = useUserStore.getState()
  const { title, description, price, onStock, images, variants, translations, manageLoading = true } = input

  if (manageLoading) {
    setIsLoading(true)
  }

  let priceLet: number | undefined = price
  try {
    if (images && images.length > MAX_PRODUCT_IMAGES) {
      throw new Error(t("product.warning.max_images_subtitle", { maxImages: MAX_PRODUCT_IMAGES }))
    }

    const productTranslations = await resolveProductTranslations(title, description, translations)
    const canonicalTranslation = productTranslations.fi

    if (!price) {
      try {
        const response = await fetch("/api/fetch-prices", {
          method: "POST",
          body: JSON.stringify({ title, description }),
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
Description: ${description}.
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
          priceLet = parsed > 0 ? parsed : 4.99
        }
      } catch (err) {
        console.error("Price estimation failed, fallback to default 4.99:", err)
        priceLet = 4.99
      }
    }

    // convert to Stripe integer cents
    if (!priceLet) throw Error("Price is not defined")

    const stripeAmount = Math.max(1, Math.floor(priceLet * 100))

    const stripeResponse = await axios.post("/api/products/add", {
      title: canonicalTranslation.title,
      description: canonicalTranslation.description,
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
          { prompt: `${title}. ${description}` } as API.GenerateImageRequest,
          { responseType: "arraybuffer" },
        )

        if (imageResponse.status !== 200) {
          throw new Error(`${t("product.error.failed_to_generate_image")} (${imageResponse.status})`)
        }

        const imageFile = new File([imageResponse.data], "generated_image.png", { type: "image/png" })
        const compressedImageFile = await compressImageWithTinify(imageFile)

        const uploadResult = await uploadImageFn({ t, imageFile: compressedImageFile, bucket: "public-images" })
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
            const compressedImageFile = await compressImageWithTinify(image.file)
            const ext = compressedImageFile.name.split(".").pop()
            const cleanName = slugify(compressedImageFile.name.replace(/\.[^/.]+$/, ""))
            const fileName = `${cleanName}_${stripeResponse.data.id}.${ext}`

            const { data, error } = await supabaseClient.storage
              .from("public-images")
              .upload(`${userStore.user?.id || getAnonymousId() || getUserId()}/${fileName}`, compressedImageFile, { upsert: true })

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

    const resolvedVariants: TProductVariant[] = (variants || [])
      .slice(0, MAX_PRODUCT_VARIANTS)
      .filter(variant => variant.label.trim() && imagesUrls[variant.imageIndex])
      .map(variant => ({
        id: variant.id,
        label: variant.label.trim(),
        image_url: imagesUrls[variant.imageIndex],
      }))

    const userId = getUserId()

    const product: TProductDB = {
      id: stripeResponse.data.product,
      price_id: stripeResponse.data.id,
      owner_id: userId,
      translations: productTranslations,
      price: priceLet,
      on_stock: onStock ?? 0,
      img_url: imagesUrls,
      variants: resolvedVariants,
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

    return product
  } catch (error) {
    const errorMessage = axios.isAxiosError(error)
      ? typeof error.response?.data === "string"
        ? error.response.data
        : typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : error.message
      : error instanceof Error
        ? error.message
        : String(error)
    console.error("createProductFn error:", errorMessage)
    throw new Error(errorMessage)
  } finally {
    if (manageLoading) {
      setIsLoading(false)
    }
  }
}
