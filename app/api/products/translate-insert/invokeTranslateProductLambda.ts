import { InvokeCommand, InvocationType, LambdaClient } from "@aws-sdk/client-lambda"

import type { TProductInsertPayload } from "./insertDBProduct"

const lambdaRegion = process.env.NEXT_PUBLIC_AWS_REGION
const lambdaFnName = "23-ai-translate"
const lambdaInvokeTimeoutMs = 20_000

const lambda = new LambdaClient({
  region: lambdaRegion,
  // An invocation can update the product and emit a Pusher event. Do not let the SDK
  // silently submit the same worker request again when its first outcome is uncertain.
  maxAttempts: 1,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

function buildLambdaPayload(payload: TProductInsertPayload): TProductInsertPayload {
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

type TInvokeTranslateProductLambdaResponse =
  | {
      status: "invoked"
      functionName: string
      region?: string
      statusCode?: number
      executedVersion?: string
      requestId?: string
    }
  | {
      status: "timeout"
      functionName: string
      region?: string
      timeoutMs: number
    }

export async function invokeTranslateProductLambda(
  payload: TProductInsertPayload,
): Promise<TInvokeTranslateProductLambdaResponse | string> {
  try {
    if (!lambdaRegion) throw new Error("Missing AWS region for translate lambda")
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
      throw new Error("AWS translation-worker credentials are not configured")
    if (!process.env.NEXT_PUBLIC_AWS_REGION)
      throw new Error("AWS translation-worker region is not configured")

    const lambdaPayload = buildLambdaPayload(payload)

    console.info("[products/translate-insert] invoking translation worker", {
      productId: payload.id,
      functionName: lambdaFnName,
      region: lambdaRegion,
    })

    const response = await Promise.race<TInvokeTranslateProductLambdaResponse>([
      lambda
        .send(
          new InvokeCommand({
            FunctionName: lambdaFnName,
            InvocationType: InvocationType.RequestResponse,
            Payload: Buffer.from(JSON.stringify(lambdaPayload)),
          }),
        )
        .then(response => {
          if (response.FunctionError) {
            throw new Error(`Translation worker returned ${response.FunctionError}`)
          }

          console.info("[products/translate-insert] translation worker accepted", {
            statusCode: response.StatusCode,
            requestId: response.$metadata.requestId,
            executedVersion: response.ExecutedVersion,
          })

          return {
            status: "invoked",
            functionName: lambdaFnName,
            region: lambdaRegion,
            statusCode: response.StatusCode,
            executedVersion: response.ExecutedVersion,
            requestId: response.$metadata.requestId,
          }
        }),
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              status: "timeout",
              functionName: lambdaFnName,
              region: lambdaRegion,
              timeoutMs: lambdaInvokeTimeoutMs,
            }),
          lambdaInvokeTimeoutMs,
        ),
      ),
    ])

    return response
  } catch (error) {
    const errorName = error instanceof Error ? error.name : ""
    const errorMessage = error instanceof Error ? error.message : ""
    const safeFailure = /credentials are not configured|region is not configured/i.test(errorMessage)
      ? "Product translation could not start because the server's AWS worker configuration is incomplete. Check the product list before starting another creation, and contact the store administrator to configure AWS credentials and region."
      : /AccessDenied|UnauthorizedOperation/i.test(errorName)
        ? "Product translation could not start because AWS denied access to the translation worker. Check the product list before starting another creation, and contact the store administrator to restore Lambda invoke permission."
        : /CredentialsProvider|InvalidClientToken|UnrecognizedClient|ExpiredToken|SignatureDoesNotMatch/i.test(`${errorName} ${errorMessage}`)
          ? "Product translation could not start because AWS rejected the server credentials. Check the product list before starting another creation, and contact the store administrator to restore AWS credentials."
        : /ResourceNotFound|FunctionError|Translation worker returned/i.test(`${errorName} ${errorMessage}`)
          ? "The AWS translation worker is unavailable or returned an execution error. Check the product list before starting another creation, and contact the store administrator to check the worker deployment."
          : "AWS did not confirm whether product translation started. Check the product list before starting another creation, and contact the store administrator to check AWS worker access."
    return safeFailure
  }
}
