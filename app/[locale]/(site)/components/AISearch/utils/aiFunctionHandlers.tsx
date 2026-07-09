// src/utils/aiFunctionHandlers.ts
// src/utils/aiFunctionHandlers.ts
import type { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { aiSDK } from "@/sdk/AISDK/AISDK"
// src/utils/aiFunctionHandlers.ts
import { createProductFn } from "@/functions/createProductFn"
import { uploadImageFn } from "@/functions/uploadImageFn"
import useCartStore from "@/store/user/cartStore"
import { RateLimitSDK } from "@/sdk/RateLimitSDK/RateLimitSDK"

type FunctionResult = {
  success: boolean
  message: string
  memory?: string
  data?: Record<string, unknown>
}

type HandlerArgs = Record<string, unknown>

const fallbackT: TI18nFunction = (k: string) => k

async function addProductToCartHandler(args: HandlerArgs): Promise<FunctionResult> {
  const { product, quantity = 1 } = args
  const { increaseProductQuantity } = useCartStore.getState()
  if (!product || typeof product !== "object")
    return { success: false, message: "Product object is missing. Please provide product details." }

  const typed = product as { title?: string; subtitle?: string; price?: number }
  if (!typed.title) return { success: false, message: "Product title is required." }
  if (!typed.subtitle) return { success: false, message: "Product subtitle is required." }
  if (typeof typed.price !== "number") return { success: false, message: "Product price is required." }

  try {
    const i18n = (args.t as unknown as TI18nFunction) ?? fallbackT
    const createdProduct = await createProductFn(i18n, {
      title: typed.title,
      description: typed.subtitle,
      price: typed.price,
      onStock: 0,
      images: [],
      variants: [],
    })
    if (!createdProduct?.id) return { success: false, message: "Failed to create product. No id." }

    for (let i = 0; i < Number(quantity || 1); i++) increaseProductQuantity(createdProduct.id)

    const quantityText = Number(quantity) > 1 ? `${quantity}x ${typed.title}` : typed.title
    return {
      success: true,
      message: `Ok — I added ${quantityText} to your cart ($${typed.price})`,
      memory: `user added ${quantityText} to cart`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add product"
    return { success: false, message }
  }
}

async function generateImageHandler(args: HandlerArgs): Promise<FunctionResult> {
  const prompt = (args.prompt as string) ?? ""
  const memory = (args.memory as string) ?? ""
  const t = (args.t as unknown as TI18nFunction) ?? fallbackT

  if (!prompt) return { success: false, message: "Missing prompt for image generation." }

  try {
    const rateLimitSDK = new RateLimitSDK()
    await rateLimitSDK.rateLimit(t, "aiGenerateImage")

    // ⚡ Combine memory + current prompt to generate accurate image
    const fullPrompt = [memory, prompt].filter(Boolean).join(" - ")

    const generatedImage = await aiSDK.generateImageBuffer(fullPrompt)

    const imageFile = new File([generatedImage.buffer], "generated_image.png", {
      type: generatedImage.contentType,
    })

    const uploadResult = await uploadImageFn({ t, imageFile, bucket: "23_public-images" })
    if (!uploadResult || typeof uploadResult === "string") {
      return { success: false, message: `Image upload failed: ${uploadResult ?? "unknown"}` }
    }

    const publicUrl = uploadResult.publicUrl
    const userMsg = t("aichat.generate_image_completed") || `Here is your image:`

    const newMemory = `${memory ? memory + " | " : ""}generated-image:${publicUrl}`

    return {
      success: true,
      message: `${userMsg}`,
      memory: newMemory,
      data: { imageUrl: publicUrl },
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, message: `Image generation error: ${msg}` }
  }
}

const functionHandlers: Record<string, (args: HandlerArgs) => Promise<FunctionResult>> = {
  addProductToCart: addProductToCartHandler,
  generateImage: generateImageHandler,
}

export async function handleAIFunctionCall(functionName: string, args: HandlerArgs): Promise<FunctionResult> {
  const handler = functionHandlers[functionName]
  if (!handler) return { success: false, message: `Unknown function: ${functionName}` }
  return handler(args)
}
