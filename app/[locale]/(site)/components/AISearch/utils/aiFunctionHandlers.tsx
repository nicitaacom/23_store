// src/utils/aiFunctionHandlers.ts
// src/utils/aiFunctionHandlers.ts
import type { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { aiSDK } from "@/sdk/AISDK/AISDK"
// src/utils/aiFunctionHandlers.ts
import { getAiImageFolder } from "@/functions/uploadImageFolder"
import { getTimestampFileName } from "@/functions/support/image/getTimestampFileName"
import { uploadImageFn } from "@/functions/uploadImageFn"

type FunctionResult = {
  success: boolean
  message: string
  memory?: string
  data?: Record<string, unknown>
}

type HandlerArgs = Record<string, unknown>

const fallbackT: TI18nFunction = (key: string) => key

async function addProductToCartHandler(args: HandlerArgs): Promise<FunctionResult> {
  const message = typeof args.t === "function"
    ? (args.t as TI18nFunction)("aichat.choose_catalog_product")
    : "Choose a product in the store catalog to add it to your cart."
  return { success: false, message }
}

async function generateImageHandler(args: HandlerArgs): Promise<FunctionResult> {
  const prompt = (args.prompt as string) ?? ""
  const memory = (args.memory as string) ?? ""
  const i18n = (args.t as unknown as TI18nFunction) ?? fallbackT

  if (!prompt) return { success: false, message: "Missing prompt for image generation." }

  try {
    // ⚡ Combine memory + current prompt to generate accurate image
    const fullPrompt = [memory, prompt].filter(Boolean).join(" - ")

    const generatedImage = await aiSDK.generateImageBuffer(fullPrompt)

    // The assistant hands back bytes and a content type, no name - so the name is the moment it
    // arrived, the same rule a pasted chat image follows.
    const generatedImageName = getTimestampFileName(generatedImage.contentType.replace("/", "."))
    const imageFile = new File([generatedImage.buffer], generatedImageName, {
      type: generatedImage.contentType,
    })

    const aiImageFolder = getAiImageFolder()
    if (!aiImageFolder) return { success: false, message: i18n("toast.please_login_title") }

    const response = await uploadImageFn({
      t: i18n,
      imageFile,
      bucket: "23_ai-product-images",
      folder: aiImageFolder,
    })
    if (!response || typeof response === "string") {
      return { success: false, message: `Image upload failed: ${response ?? "unknown"}` }
    }

    const publicUrl = response.publicUrl
    const userMsg = i18n("aichat.generate_image_completed") || `Here is your image:`

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
