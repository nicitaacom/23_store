"use strict"

const assert = require("node:assert/strict")
const test = require("node:test")
const typescriptParser = require("@typescript-eslint/parser")
const { Linter } = require("eslint")

const rule = require("./no-generic-image-file-name")

function verify(code) {
  const linter = new Linter({ configType: "flat" })

  return linter.verify(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: {
          parser: typescriptParser,
          parserOptions: { ecmaVersion: 2022, sourceType: "module" },
        },
        plugins: { local: { rules: rule } },
        rules: { "local/no-generic-image-file-name": "error" },
      },
    ],
    { filename: "app/functions/example.ts" },
  )
}

test("reports a pasted image named image.png", () => {
  const messages = verify(`const imageFile = new File([bytes], "image.png", { type: "image/png" })`)

  assert.equal(messages.length, 1)
  assert.match(messages[0].message, /says nothing about the image/)
})

test("reports the other generic names, numbered or not", () => {
  const genericNames = ["images.jpg", "img.webp", "generated_image.png", "screenshot-2.png", "Untitled.avif", "photo (1).jpg"]

  for (const genericName of genericNames) {
    const messages = verify(`const imageFile = new File([bytes], "${genericName}")`)
    assert.equal(messages.length, 1, `expected ${genericName} to be reported`)
  }
})

test("allows a name built from the product title", () => {
  const messages = verify(`const imageFile = new File([bytes], \`\${titleSlug}-\${index}.jpg\`)`)

  assert.deepEqual(messages, [])
})

test("allows a name built from the moment the image arrived", () => {
  const messages = verify(`const imageFile = new File([bytes], getTimestampFileName(pastedImage))`)

  assert.deepEqual(messages, [])
})

test("allows a real name the buyer picked", () => {
  const messages = verify(`const imageFile = new File([bytes], "my-kovrik.jpg")`)

  assert.deepEqual(messages, [])
})

test("leaves a File's own name alone - that one is real", () => {
  const messages = verify(`const fileName = pickedFile.name`)

  assert.deepEqual(messages, [])
})
