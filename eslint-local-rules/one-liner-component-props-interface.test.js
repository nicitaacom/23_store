"use strict"

const assert = require("node:assert/strict")
const test = require("node:test")
const typescriptParser = require("@typescript-eslint/parser")
const { Linter } = require("eslint")

const rule = require("./one-liner-component-props-interface")

function verify(code) {
  const linter = new Linter({ configType: "flat" })

  return linter.verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: {
          parser: typescriptParser,
          parserOptions: { ecmaVersion: 2022, sourceType: "module" },
        },
        plugins: { local: { rules: rule } },
        rules: { "local/one-liner-component-props-interface": "error" },
      },
    ],
    { filename: "app/components/Example.tsx" },
  )
}

test("allows short inline component props that fit on one line", () => {
  const messages = verify(`
    export function Example({ title }: { title: string }) {
      return <p>{title}</p>
    }
  `)

  assert.deepEqual(messages, [])
})

test("reports multiline inline component props that do not fit on one line", () => {
  const messages = verify(`
    export function Example({
      description,
      onConfirm,
      title,
    }: {
      description: string
      onConfirm: (description: string) => Promise<string | undefined>
      title: string
    }) {
      return <button onClick={() => onConfirm(description)}>{title}</button>
    }
  `)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "inlinePropsType")
})

test("allows a named props interface", () => {
  const messages = verify(`
    interface ExampleProps {
      description: string
      onConfirm: (description: string) => Promise<string | undefined>
      title: string
    }

    export function Example({ description, onConfirm, title }: ExampleProps) {
      return <button onClick={() => onConfirm(description)}>{title}</button>
    }
  `)

  assert.deepEqual(messages, [])
})

test("checks components wrapped in memo", () => {
  const messages = verify(`
    const Example = memo(function Example({
      description,
      onConfirm,
      title,
    }: {
      description: string
      onConfirm: (description: string) => Promise<string | undefined>
      title: string
    }) {
      return <button onClick={() => onConfirm(description)}>{title}</button>
    })
  `)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "inlinePropsType")
})

test("ignores PascalCase helpers that do not render JSX", () => {
  const messages = verify(`
    function Example({
      description,
      onConfirm,
      title,
    }: {
      description: string
      onConfirm: (description: string) => Promise<string | undefined>
      title: string
    }) {
      return onConfirm(description + title)
    }
  `)

  assert.deepEqual(messages, [])
})
