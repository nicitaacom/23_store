import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { createRawProductTranslations } from "@/utils/product"

export async function insertDBProduct(payload: API.ProductsTranslateAndInsertRequest): Promise<string | null> {
  const { error: insertError } = await supabaseAdmin.from("products").insert({
    id: payload.id,
    price_id: payload.price_id,
    owner_id: payload.owner_id,
    price: payload.price,
    on_stock: payload.on_stock,
    img_url: payload.img_url,
    variants: payload.variants ?? null,
    translations: createRawProductTranslations(payload.title, payload.description),
  })

  if (insertError) return insertError.message
  return null
}

export async function deleteDBProduct(productId: string): Promise<string | null> {
  const { error: deleteError } = await supabaseAdmin.from("products").delete().eq("id", productId)

  if (deleteError) return deleteError.message
  return null
}
