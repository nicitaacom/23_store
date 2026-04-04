import { InvokeCommand, InvocationType, LambdaClient } from "@aws-sdk/client-lambda"
import { NextResponse } from "next/server"

export const maxDuration = 30

const lambdaFnName = "23-ai-translate"

const lambda = new LambdaClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

type TLambdaProxyEvent = {
  body: string
  headers: Record<string, string>
  httpMethod: "POST"
  path: string
  resource: string
  isBase64Encoded: false
}

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

function normalizePayload(payload: API.ProductsTranslateAndInsertRequest): API.ProductsTranslateAndInsertRequest {
  return {
    ...payload,
    price: parseNumericValue(payload.price),
    on_stock: parseNumericValue(payload.on_stock),
  }
}

function getInvalidPayloadFields(payload: API.ProductsTranslateAndInsertRequest) {
  const invalidFields: string[] = []

  if (!payload.id?.trim()) invalidFields.push("id")
  if (!payload.price_id?.trim()) invalidFields.push("price_id")
  if (!payload.owner_id?.trim()) invalidFields.push("owner_id")
  if (!payload.title?.trim()) invalidFields.push("title")
  if (!payload.description?.trim()) invalidFields.push("description")
  if (!Number.isFinite(payload.price)) invalidFields.push("price")
  if (!Number.isFinite(payload.on_stock)) invalidFields.push("on_stock")
  if (!Array.isArray(payload.img_url) || payload.img_url.length === 0 || payload.img_url.some(imageUrl => !imageUrl?.trim())) {
    invalidFields.push("img_url")
  }
  if (payload.variants !== undefined && payload.variants !== null && !Array.isArray(payload.variants)) {
    invalidFields.push("variants")
  }

  return invalidFields
}

function buildLambdaEvent(payload: API.ProductsTranslateAndInsertRequest): TLambdaProxyEvent {
  return {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    httpMethod: "POST",
    path: "/api/products/translate-insert",
    resource: "/api/products/translate-insert",
    isBase64Encoded: false,
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()

  try {
    const parsedPayload = normalizePayload((await req.json()) as API.ProductsTranslateAndInsertRequest)
    const lambdaEvent = buildLambdaEvent(parsedPayload)
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

    console.info("[products/translate-insert] invoking lambda", {
      requestId,
      functionName: lambdaFnName,
      productId: parsedPayload.id,
      ownerId: parsedPayload.owner_id,
      imageCount: parsedPayload.img_url?.length ?? 0,
      variantsCount: parsedPayload.variants?.length ?? 0,
      titleLength: parsedPayload.title?.length ?? 0,
      descriptionLength: parsedPayload.description?.length ?? 0,
    })

    console.info("[products/translate-insert] lambda body\n" + JSON.stringify(parsedPayload, null, 2))

    const response = await lambda.send(
      new InvokeCommand({
        FunctionName: lambdaFnName,
        InvocationType: InvocationType.Event,
        Payload: Buffer.from(JSON.stringify(lambdaEvent)),
      }),
    )

    console.info("[products/translate-insert] lambda success", {
      requestId,
      statusCode: response.StatusCode,
      executedVersion: response.ExecutedVersion,
    })

    return NextResponse.json({ ok: true } satisfies API.ProductsTranslateAndInsertResponse, { status: response.StatusCode ?? 202 })
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
