export async function mapWithConcurrency<Input, Output>(
  inputs: Input[],
  maxConcurrent: number,
  operation: (input: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  const outputs: Output[] = new Array(inputs.length)
  let nextIndex = 0
  let hasFailed = false
  let firstError: unknown

  async function runNext() {
    while (nextIndex < inputs.length && !hasFailed) {
      const index = nextIndex++
      try {
        outputs[index] = await operation(inputs[index], index)
      } catch (error) {
        if (!hasFailed) {
          firstError = error
          hasFailed = true
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(maxConcurrent, inputs.length) }, () => runNext()))
  if (hasFailed) throw firstError
  return outputs
}
