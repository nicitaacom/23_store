import { createProductFn } from "@/functions/createProductFn"
import useCartStore from "@/store/user/cartStore"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"

type FunctionResult = { success: boolean; message: string; memory?: string }

type FunctionHandler = (args: Record<string, unknown>) => Promise<FunctionResult>

async function addProductToCartHandler(args: Record<string, unknown>): Promise<FunctionResult> {
  const { product, quantity = 1, note } = args
  const { increaseProductQuantity } = useCartStore.getState()

  if (!product || typeof product !== "object") {
    return { success: false, message: "Product object is missing. Please provide product details." }
  }

  if (!("title" in product) || !product.title) {
    return { success: false, message: "Product title is required to add to cart." }
  }

  if (!("subtitle" in product) || !product.subtitle) {
    return { success: false, message: "Product subtitle is required. Please describe the product." }
  }

  if (!("price" in product) || typeof product.price !== "number") {
    return { success: false, message: "Product price is required. Please specify a price in USD." }
  }

  const typedProduct = product as { title: string; subtitle: string; price: number }
  const typedQuantity = typeof quantity === "number" ? quantity : 1

  try {
    const i18n = args.t as TI18nFunction
    const createdProduct = await createProductFn(i18n, typedProduct.title, typedProduct.subtitle, typedProduct.price, 0, [])

    if (!createdProduct?.id) return { success: false, message: "Failed to create product. No id." }

    for (let i = 0; i < typedQuantity; i++) {
      increaseProductQuantity(createdProduct.id)
    }

    const quantityText = typedQuantity > 1 ? `${typedQuantity}x ${typedProduct.title}` : typedProduct.title
    return {
      success: true,
      message: `Ok — I added ${quantityText} to your cart ($${typedProduct.price})`,
      memory: `user just added ${quantityText} to cart`,
    }
  } catch (error) {
    console.error("addProductToCart error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add product to cart. Please try again.",
    }
  }
}

const functionHandlers: Record<string, FunctionHandler> = {
  addProductToCart: addProductToCartHandler,
}

export async function handleAIFunctionCall(functionName: string, args: Record<string, unknown>): Promise<FunctionResult> {
  const handler = functionHandlers[functionName]

  if (!handler) return { success: false, message: `Unknown function: ${functionName}` }

  return await handler(args)
}
