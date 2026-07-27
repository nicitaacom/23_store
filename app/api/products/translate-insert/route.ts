import { NextResponse } from "next/server"

import { deleteDBProduct, insertDBProduct } from "./insertDBProduct"
import { invokeTranslateProductLambda } from "./invokeTranslateProductLambda"
import type { TProductInsertPayload } from "./insertDBProduct"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export const runtime = "nodejs"
export const maxDuration = 30

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN

  const normalizedValue = value.replaceAll(",", "").trim()
  if (!normalizedValue) return Number.NaN

  return Number(normalizedValue)
}

function normalizeVariants(variants: API.ProductsTranslateAndInsertRequest["variants"]) {
  if (!Array.isArray(variants)) return variants

  return variants.map(variant => ({
    ...variant,
    price: parseNumericValue((variant as API.ProductsVariant & { price?: number | string }).price),
  }))
}

function normalizePayload(payload: TProductInsertPayload): TProductInsertPayload {
  return {
    ...payload,
    description: typeof payload.description === "string" ? payload.description : "",
    price: parseNumericValue(payload.price),
    on_stock: parseNumericValue(payload.on_stock),
    variants: normalizeVariants(payload.variants),
  }
}

function getInvalidPayloadFields(payload: TProductInsertPayload) {
  const invalidFields: string[] = []

  if (!payload.id?.trim()) invalidFields.push("id")
  if (!payload.price_id?.trim()) invalidFields.push("price_id")
  if (!payload.owner_id?.trim()) invalidFields.push("owner_id")
  if (!payload.title?.trim()) invalidFields.push("title")
  if (!Number.isFinite(payload.price)) invalidFields.push("price")
  if (!Number.isFinite(payload.on_stock)) invalidFields.push("on_stock")
  if (!Array.isArray(payload.img_url) || payload.img_url.length === 0 || payload.img_url.some(imageUrl => !imageUrl?.trim())) {
    invalidFields.push("img_url")
  }
  if (payload.variants !== undefined && payload.variants !== null && !Array.isArray(payload.variants)) {
    invalidFields.push("variants")
  }
  if (
    Array.isArray(payload.variants) &&
    payload.variants.some(
      variant =>
        !variant.id?.trim() ||
        !variant.label?.trim() ||
        !variant.image_url?.trim() ||
        !Number.isFinite(variant.price) ||
        variant.price <= 0,
    )
  ) {
    invalidFields.push("variants")
  }

  return invalidFields
}
/**
 * Creates the product row in Supabase immediately with source-text translations,
 * then asks Lambda to translate, upsert the final localized values, and emit
 * the final realtime event later.
 *
 * Reason we use Lambda for translation instead of doing it in the Next.js/Vercel app:
 * Vercel server execution is time-limited to about 60 seconds, while product
 * translation can take around 3-5 minutes.
 *
 * Important ownership boundary:
 * this route only performs the initial insert and Lambda handoff.
 * Lambda is responsible for the eventual `product:created` Pusher event after
 * the translated upsert is finished.
 */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const supabase = await supabaseRouteHandler()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" } satisfies API.ProductsTranslateAndInsertResponse, {
        status: 401,
      })
    }

    const requestPayload = (await req.json()) as API.ProductsTranslateAndInsertRequest
    const parsedPayload = normalizePayload({ ...requestPayload, owner_id: user.id })
    const invalidFields = getInvalidPayloadFields(parsedPayload)

    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Missing or invalid required product fields: ${invalidFields.join(", ")}`,
        } satisfies API.ProductsTranslateAndInsertResponse,
        { status: 400 },
      )
    }

    console.info("[products/translate-insert] creating product", {
      requestId,
      productId: parsedPayload.id,
      ownerId: parsedPayload.owner_id,
      imageCount: parsedPayload.img_url?.length ?? 0,
      variantsCount: parsedPayload.variants?.length ?? 0,
      titleLength: parsedPayload.title?.length ?? 0,
      descriptionLength: parsedPayload.description?.length ?? 0,
    })

    const insertDBProductResp = await insertDBProduct(supabase, parsedPayload)
    if (typeof insertDBProductResp === "string") {
      throw new Error(insertDBProductResp)
    }

    const invokeTranslateProductLambdaResponse = await invokeTranslateProductLambda(parsedPayload)
    if (typeof invokeTranslateProductLambdaResponse === "string") {
      const deleteDBProductResp = await deleteDBProduct(supabase, parsedPayload.id)

      console.error("[products/translate-insert] lambda invoke failed after product insert", {
        requestId,
        productId: parsedPayload.id,
        errorMessage: invokeTranslateProductLambdaResponse,
        deleteDBProductResp,
      })

      throw new Error(invokeTranslateProductLambdaResponse)
    }

    if (invokeTranslateProductLambdaResponse.status === "timeout") {
      console.warn("[products/translate-insert] lambda invoke timed out, continuing without blocking response", {
        requestId,
        productId: parsedPayload.id,
        functionName: invokeTranslateProductLambdaResponse.functionName,
        region: invokeTranslateProductLambdaResponse.region,
        timeoutMs: invokeTranslateProductLambdaResponse.timeoutMs,
      })
    } else {
      console.info("[products/translate-insert] lambda invoked", {
        requestId,
        functionName: invokeTranslateProductLambdaResponse.functionName,
        region: invokeTranslateProductLambdaResponse.region,
        productId: parsedPayload.id,
        statusCode: invokeTranslateProductLambdaResponse.statusCode,
        executedVersion: invokeTranslateProductLambdaResponse.executedVersion,
        lambdaRequestId: invokeTranslateProductLambdaResponse.requestId,
      })
    }

    console.info("[products/translate-insert] product created", {
      requestId,
      productId: parsedPayload.id,
      ownerId: parsedPayload.owner_id,
    })

    return NextResponse.json({ ok: true } satisfies API.ProductsTranslateAndInsertResponse, { status: 200 })
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    console.error("[products/translate-insert] route failed", {
      requestId,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json({ ok: false, error: errorMessage } satisfies API.ProductsTranslateAndInsertResponse, { status: 500 })
  }
}
