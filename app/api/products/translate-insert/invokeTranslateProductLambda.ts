import { InvokeCommand, InvocationType, LambdaClient } from "@aws-sdk/client-lambda"

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

export async function invokeTranslateProductLambda(
  payload: API.ProductsTranslateAndInsertRequest,
): Promise<{ functionName: string; statusCode?: number; executedVersion?: string } | string> {
  try {
    const lambdaEvent = buildLambdaEvent(payload)

    console.info("[products/translate-insert] invoking lambda with payload", {
      payload: JSON.parse(lambdaEvent.body),
    })

    const response = await lambda.send(
      new InvokeCommand({
        FunctionName: lambdaFnName,
        InvocationType: InvocationType.RequestResponse,
        Payload: Buffer.from(JSON.stringify(lambdaEvent)),
      }),
    )

    return {
      functionName: lambdaFnName,
      statusCode: response.StatusCode,
      executedVersion: response.ExecutedVersion,
    }
  } catch (error) {
    if (error instanceof Error) return error.message
    return String(error)
  }
}
