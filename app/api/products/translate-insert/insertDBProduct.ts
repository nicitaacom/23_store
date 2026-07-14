import { createRawProductTranslations } from "@/utils/product"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export type TProductInsertPayload = API.ProductsTranslateAndInsertRequest & { owner_id: string }

type SupabaseRouteHandlerClient = Awaited<ReturnType<typeof supabaseRouteHandler>>

export async function insertDBProduct(
  supabase: SupabaseRouteHandlerClient,
  payload: TProductInsertPayload,
): Promise<string | null> {
  const { error: insertError } = await supabase.from("23_products").insert({
    id: payload.id,
    price_id: payload.price_id,
    owner_id: payload.owner_id,
    price: payload.price,
    on_stock: payload.on_stock,
    img_url: payload.img_url,
    variants: payload.variants ?? null,
    translations: createRawProductTranslations(payload.title, payload.description),
    category_id: payload.category_id ?? null,
  })

  if (insertError) return insertError.message
  return null
}

export async function deleteDBProduct(supabase: SupabaseRouteHandlerClient, productId: string): Promise<string | null> {
  const { error: deleteError } = await supabase.from("23_products").delete().eq("id", productId)

  if (deleteError) return deleteError.message
  return null
}
