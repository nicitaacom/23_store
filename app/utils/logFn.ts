// utils/logFn.ts
function getLineNumber() {
  const error = new Error()
  const stack = error.stack?.split("\n")
  // Adjust the index based on the depth of the function calls in the stack trace
  const callerLine = stack ? stack[3] : ""
  const lineNumber = callerLine.match(/:(\d+):\d+/)
  return lineNumber ? lineNumber[1] : "unknown"
}

export function logFn(message: string, ...optionalParams: unknown[]) {
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_IS_DEBUG === "true") {
    const lineNumber = getLineNumber()
    console.log(`[Line ${Number(lineNumber)}] ${message}`, ...optionalParams)
  }
}
