"use strict"

const assert = require("node:assert/strict")
const test = require("node:test")
const { Linter } = require("eslint")

const rule = require("./no-vague-error-msg")

function verify(code, filename = "app/components/Example.tsx") {
  const linter = new Linter({ configType: "flat" })

  return linter.verify(
    code,
    [
      {
        files: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
        languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: { rules: rule } },
        rules: { "local/no-vague-error-msg": "error" },
      },
    ],
    { filename },
  )
}

test("rejects user-facing retry instructions and recommends automatic retry logic", () => {
  const messages = verify('toast.show("error", "Translation failed", "Please try again later")')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "userRetryInstruction")
  assert.match(messages[0].message, /automatic retry with a longer timeout/)
})

test("rejects retry instructions even when another step is present", () => {
  const messages = verify('setTranslationError("The service timed out. Please retry or contact support")')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "userRetryInstruction")
})

test("rejects a refresh instruction that asks the user to try again", () => {
  const messages = verify('setStorageError("No usage data is available. Refresh to try again")')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "userRetryInstruction")
})

test("allows a corrective recovery step without asking the user to retry", () => {
  const messages = verify('setPaymentError("The card was declined. Change the payment method or contact support")')

  assert.deepEqual(messages, [])
})

test("allows an error to report that the application retried automatically", () => {
  const messages = verify(
    'setTranslationError("A service delay was handled by an automatic retry. Contact support if translations are missing")',
  )

  assert.deepEqual(messages, [])
})

test("requires a recovery step when an error does not ask the user to retry", () => {
  const messages = verify('setServiceError("A service delay is still ongoing")')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "noNextStep")
})

test("checks static JSX error text for retry instructions", () => {
  const messages = verify('<p className="text-danger">Please try again</p>')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "userRetryInstruction")
})
