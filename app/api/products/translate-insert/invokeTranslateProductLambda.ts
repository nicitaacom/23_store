import { InvokeCommand, InvocationType, LambdaClient } from "@aws-sdk/client-lambda"

const lambdaRegion = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION
const lambdaFnName = process.env.AWS_TRANSLATE_LAMBDA_FUNCTION_NAME || "23-ai-translate"

const lambda = new LambdaClient({
  region: lambdaRegion,
  maxAttempts: 3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function invokeTranslateProductLambda(
  payload: API.ProductsTranslateAndInsertRequest,
): Promise<{ functionName: string; region?: string; statusCode?: number; executedVersion?: string; requestId?: string } | string> {
  try {
    if (!lambdaRegion) {
      throw new Error("Missing AWS region for translate lambda")
    }

    console.info("[products/translate-insert] invoking lambda with payload", {
      payload,
    })

    const response = await lambda.send(
      new InvokeCommand({
        FunctionName: lambdaFnName,
        InvocationType: InvocationType.RequestResponse,
        Payload: Buffer.from(JSON.stringify(payload)),
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
