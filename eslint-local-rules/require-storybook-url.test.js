"use strict"

const assert = require("node:assert/strict")
const test = require("node:test")
const { Linter } = require("eslint")

const rule = require("./require-storybook-url")

function verify(code) {
  const linter = new Linter({ configType: "flat" })
  return linter.verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        languageOptions: { ecmaVersion: 2022, sourceType: "module" },
        plugins: { local: { rules: rule } },
        rules: { "local/require-storybook-url": "error" },
      },
    ],
    { filename: "app/components/Example.tsx" },
  )
}

test("allows an exported component with a local Storybook URL directly above it", () => {
  const messages = verify(`
    // http://localhost:6006/?path=/story/admin-example--default
    export function Example() { return null }
  `)

  assert.deepEqual(messages, [])
})

test("reports an exported component without a Chromatic story URL", () => {
  const messages = verify(`
    export function Example() { return null }
  `)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "missingStorybookUrl")
})

test("supports exported arrow-function components", () => {
  const messages = verify(`
    // https://6a567f3438bf60fcf2e0f36b-ahswkdyqry.chromatic.com/?path=/story/admin-example--default
    export const Example = () => null
  `)

  assert.deepEqual(messages, [])
})

test("ignores exported hooks and utility functions", () => {
  const messages = verify(`
    export function useExample() { return null }
    export function getExample() { return null }
  `)

  assert.deepEqual(messages, [])
})

test("ignores route handlers exported as HTTP methods", () => {
  const messages = verify(`
    export async function POST() { return null }
    export async function GET() { return null }
    export async function DELETE() { return null }
  `)

  assert.deepEqual(messages, [])
})

test("ignores async server components", () => {
  const messages = verify(`
    export async function Navbar() { return null }
    export default async function Layout() { return null }
    export const Sidebar = async () => null
  `)

  assert.deepEqual(messages, [])
})

test("checks named default-exported components", () => {
  const messages = verify(`
    export default function Example() { return null }
  `)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "missingStorybookUrl")
})

test("checks forwardRef component exports", () => {
  const messages = verify(`
    // http://localhost:6006/?path=/story/admin-example--default
    export const Example = forwardRef(() => null)
  `)

  assert.deepEqual(messages, [])
})
