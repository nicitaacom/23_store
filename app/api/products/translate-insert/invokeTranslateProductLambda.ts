import { InvokeCommand, InvocationType, LambdaClient } from "@aws-sdk/client-lambda"

const lambdaRegion = process.env.NEXT_PUBLIC_AWS_REGION
const lambdaFnName = "23-ai-translate"

const lambda = new LambdaClient({
  region: lambdaRegion,
  maxAttempts: 3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

function buildLambdaPayload(payload: API.ProductsTranslateAndInsertRequest): API.ProductsTranslateAndInsertRequest {
  return {
    id: payload.id,
    price_id: payload.price_id,
    owner_id: payload.owner_id,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    on_stock: payload.on_stock,
    img_url: payload.img_url,
    variants: payload.variants ?? null,
  }
}

export async function invokeTranslateProductLambda(
  payload: API.ProductsTranslateAndInsertRequest,
): Promise<
  { functionName: string; region?: string; statusCode?: number; executedVersion?: string; requestId?: string } | string
> {
  try {
    if (!lambdaRegion) throw new Error("Missing AWS region for translate lambda")
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_ACCESS_KEY_ID.endsWith("P54S"))
      throw new Error("Missing AWS_ACCESS_KEY_ID if it does not ends with P54S")
    if (!process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_SECRET_ACCESS_KEY.endsWith("kSRb"))
      throw new Error("Missing AWS_SECRET_ACCESS_KEY or it does not ends with kSRb")
    if (!process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION !== "eu-central-1")
      throw new Error("Missing NEXT_PUBLIC_AWS_REGION or it's not eu-central-1")

    const lambdaPayload = buildLambdaPayload(payload)

    console.info(`[products/translate-insert] invoking lambda with payload ${JSON.stringify(lambdaPayload)}`)
    console.info("[lambda] config:", { lambdaRegion, lambdaFnName })

    const response = await lambda.send(
      new InvokeCommand({
        FunctionName: lambdaFnName,
        InvocationType: InvocationType.RequestResponse,
        Payload: Buffer.from(JSON.stringify(lambdaPayload)),
      }),
    )

    if (response.FunctionError) {
      const payloadText = response.Payload ? new TextDecoder().decode(response.Payload) : ""
      throw new Error(payloadText || `Lambda execution failed with ${response.FunctionError}`)
    }

    return {
      functionName: lambdaFnName,
      region: lambdaRegion,
      statusCode: response.StatusCode,
      executedVersion: response.ExecutedVersion,
      requestId: response.$metadata.requestId,
    }
  } catch (error) {
    if (error instanceof Error) return error.message
    return String(error)
  }
}
