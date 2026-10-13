import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs"

const DEFAULT_FUNCTION_NAME = "23-ai-translate"
const DEFAULT_REGION = "eu-central-1"
const REQUEST_LOOKBACK_MS = 15 * 60 * 1000
const POLL_INTERVAL_MS = 5000
const MAX_WAIT_MS = 120000

function getRequestId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9-]{8,128}$/.test(value)) {
    throw new Error("Lambda log verification requires one exact AWS request id")
  }
  return value
}

function getClient(environment, region) {
  const accessKeyId = environment.AWS_ACCESS_KEY_ID
  const secretAccessKey = environment.AWS_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error("Lambda log verification requires AWS credentials and region")
  }
  return new CloudWatchLogsClient({
    region,
    maxAttempts: 2,
    credentials: { accessKeyId, secretAccessKey },
  })
}

async function readRequestEvents(client, logGroupName, requestId, startTime, endTime) {
  const events = []
  let nextToken
  do {
    const page = await client.send(new FilterLogEventsCommand({
      logGroupName,
      startTime,
      endTime,
      filterPattern: `"${requestId}"`,
      nextToken,
      limit: 1000,
    }))
    events.push(...(page.events ?? []))
    if (!page.nextToken || page.nextToken === nextToken) break
    nextToken = page.nextToken
  } while (true)
  return events
}

export async function verifyLambdaExecution(environment = process.env, input = {}) {
  const requestId = getRequestId(input.requestId)
  const functionName = input.functionName ?? DEFAULT_FUNCTION_NAME
  if (functionName !== DEFAULT_FUNCTION_NAME) throw new Error("Unexpected translation worker name")
  const region = input.region ?? environment.NEXT_PUBLIC_AWS_REGION ?? DEFAULT_REGION
  const client = getClient(environment, region)
  const logGroupName = `/aws/lambda/${functionName}`
  const startedAt = Date.now()
  const startTime = startedAt - REQUEST_LOOKBACK_MS
  const stopAt = startedAt + Math.min(Math.max(Number(input.timeoutMs) || MAX_WAIT_MS, POLL_INTERVAL_MS), MAX_WAIT_MS)
  let sawEnd = false
  let sawReport = false
  let sawExecutionError = false

  try {
    while (Date.now() <= stopAt) {
      const events = await readRequestEvents(client, logGroupName, requestId, startTime, Date.now())
      for (const event of events) {
        const message = event.message ?? ""
        if (message.includes(`END RequestId: ${requestId}`)) sawEnd = true
        if (message.includes(`REPORT RequestId: ${requestId}`)) sawReport = true
        if (message.includes(`RequestId: ${requestId}`)
          && /\bStatus:\s*error\b|\bError Type:|Task timed out after|Runtime\.ExitError|\bERROR\b/i.test(message)) {
          sawExecutionError = true
        }
      }
      if (sawEnd && sawReport) break
      if (Date.now() + POLL_INTERVAL_MS > stopAt) break
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  } finally {
    client.destroy()
  }

  if (!sawEnd || !sawReport) {
    throw new Error(`Lambda request ${requestId} did not produce terminal END and REPORT log events`)
  }
  if (sawExecutionError) throw new Error(`Lambda request ${requestId} ended with an execution error`)

  return {
    requestId,
    functionName,
    region,
    terminal: true,
    verificationReference: `cloudwatch:${logGroupName}:${requestId}:end-and-report`,
  }
}
