import { NextResponse } from "next/server"
import openai from "@/libs/openai"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { normalizeProduct } from "@/utils/productVariants"

const LOCALES = ["en", "fi", "ru", "se"] as const

function isValidTranslations(value: unknown): value is API.ProductsTranslations {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return LOCALES.every(locale => typeof (value as Record<string, unknown>)[locale] === "object")
}

function isValidAIOutput(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return LOCALES.every(locale => typeof (value as Record<string, unknown>)[locale] === "string" && (value as Record<string, string>)[locale].trim().length > 0)
}

const SYSTEM_PROMPTS = {
  title: `You are a translation assistant. Translate the product title below into English (en), Finnish (fi), Russian (ru), and Swedish (se).
Return ONLY a raw JSON object — no markdown code block, no explanation, no extra keys.
The response must be exactly this shape:
{"en":"...","fi":"...","ru":"...","se":"..."}`,
  description: `You are a translation assistant. Translate the product description below into English (en), Finnish (fi), Russian (ru), and Swedish (se).
Preserve inline markdown formatting: **bold**, *italic*, _underline_. Do not add or remove any formatting markers.
Return ONLY a raw JSON object — no markdown code block, no explanation, no extra keys.
The response must be exactly this shape:
{"en":"...","fi":"...","ru":"...","se":"..."}`,
}

export async function POST(req: Request) {
  const body = (await req.json()) as API.ProductsTranslateFieldRequest

  if (!body.productId?.trim()) return NextResponse.json({ error: "productId missing" }, { status: 400 })
  if (!body.field || !SYSTEM_PROMPTS[body.field]) return NextResponse.json({ error: "field must be 'title' or 'description'" }, { status: 400 })
  if (!body.value?.trim()) return NextResponse.json({ error: "value missing" }, { status: 400 })
  if (!isValidTranslations(body.translations)) return NextResponse.json({ error: "translations missing or invalid" }, { status: 400 })

  const supabase = await supabaseServerAction()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: existingProduct, error: fetchError } = await supabase
    .from("23_products")
    .select("*")
    .eq("id", body.productId)
    .single()

  if (fetchError || !existingProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (existingProduct.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[body.field] },
        { role: "user", content: body.value.trim() },
      ],
      max_completion_tokens: 4000,
    })

    const raw = (completion.choices[0]?.message?.content ?? "").trim()
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    console.log("[translate-field] raw AI response:", raw)

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseError) {
      console.error("[translate-field] JSON parse error:", parseError, "cleaned:", cleaned)
      return NextResponse.json({ error: `AI returned invalid JSON: ${cleaned.slice(0, 200)}` }, { status: 500 })
    }

    if (!isValidAIOutput(parsed)) {
      console.error("[translate-field] invalid AI output shape:", parsed)
      return NextResponse.json({ error: "AI returned invalid translation shape" }, { status: 500 })
    }

    const mergedTranslations: API.ProductsTranslations = {
      en: { ...body.translations.en, [body.field]: parsed.en },
      fi: { ...body.translations.fi, [body.field]: parsed.fi },
      ru: { ...body.translations.ru, [body.field]: parsed.ru },
      se: { ...body.translations.se, [body.field]: parsed.se },
    }

    const { error: updateError } = await supabase
      .from("23_products")
      .update({ translations: mergedTranslations })
      .eq("id", body.productId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const { data: updatedProduct, error: refetchError } = await supabase
      .from("23_products")
      .select("*")
      .eq("id", body.productId)
      .single()

    if (refetchError || !updatedProduct) return NextResponse.json({ error: "Failed to fetch updated product" }, { status: 500 })

    return NextResponse.json({ product: normalizeProduct(updatedProduct) } satisfies API.ProductsTranslateFieldResponse, { status: 200 })
  } catch (error) {
    console.error("[translate-field] unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Translation failed" }, { status: 500 })
  }
}
