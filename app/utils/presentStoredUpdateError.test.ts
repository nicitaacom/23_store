import { describe, expect, it } from "vitest"

import { presentStoredUpdateError, recoverStoredUpdateError } from "./presentStoredUpdateError"

const recoveryMessage = "Изменение не сохранилось. Напишите в поддержку, если это повторится."

describe("presentStoredUpdateError", () => {
  it("replaces a provider parse failure with the recovery sentence", () => {
    expect(presentStoredUpdateError("AI returned invalid JSON:", recoveryMessage)).toBe(recoveryMessage)
    expect(presentStoredUpdateError("AI returned invalid JSON: {", recoveryMessage)).toBe(recoveryMessage)
  })

  it("replaces a file path and a filler status", () => {
    expect(presentStoredUpdateError("update failed \n Path:/api/items/update/route.ts", recoveryMessage)).toBe(recoveryMessage)
    expect(presentStoredUpdateError("Request failed (500)", recoveryMessage)).toBe(recoveryMessage)
    expect(presentStoredUpdateError("No valid update payload provided", recoveryMessage)).toBe(recoveryMessage)
    expect(presentStoredUpdateError(recoverStoredUpdateError(""), recoveryMessage)).toBe(recoveryMessage)
    expect(recoverStoredUpdateError("AI returned invalid JSON:")).toBe(recoverStoredUpdateError(""))
    expect(presentStoredUpdateError("   ", recoveryMessage)).toBe(recoveryMessage)
  })

  it("keeps a sentence that already explains the next step", () => {
    const translationFailure =
      "The translation service could not create all four translations after an automatic retry. Your saved text is unchanged. Contact support if this continues."
    expect(presentStoredUpdateError(translationFailure, recoveryMessage)).toBe(translationFailure)
    expect(presentStoredUpdateError("Title is too short - minimum 3 characters", recoveryMessage)).toBe(
      "Title is too short - minimum 3 characters",
    )
  })
})
