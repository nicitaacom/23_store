"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")
const { Linter } = require("eslint")
const typescriptParser = require("@typescript-eslint/parser")
const prettier = require("prettier")
const rule = require("./envs-order")

function declarations(contents) {
  return "declare global {\n  namespace NodeJS {\n    interface ProcessEnv {\n"
    + contents + "\n    }\n  }\n}\n\nexport {}\n"
}

function lintExample(example, source, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "envs-order-"))
  let readFileMock
  try {
    fs.writeFileSync(path.join(root, "package.json"), "{}")
    if (example !== null) fs.writeFileSync(path.join(root, ".env.example"), example)
    const filename = path.join(root, options.filename ?? "env.d.ts")
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    fs.writeFileSync(filename, options.diskSource ?? source)
    const readFileSync = fs.readFileSync
    readFileMock = test.mock.method(fs, "readFileSync", (filename, ...args) => {
      assert.notEqual(path.basename(String(filename)), ".env.local", "private environment files must stay unread")
      return readFileSync(filename, ...args)
    })

    const linter = new Linter({ cwd: root, configType: "flat" })
    const config = [{
      files: ["**/*.ts"],
      languageOptions: { parser: typescriptParser, parserOptions: { sourceType: "module" } },
      linterOptions: { reportUnusedDisableDirectives: "off" },
      plugins: { local: { rules: rule }, "local-rules": { rules: require("./unused-declared-vars") } },
      rules: { "local/envs-order": "error" },
    }]
    const verification = options.fix
      ? linter.verifyAndFix(source, config, { filename })
      : { messages: linter.verify(source, config, { filename }), output: source }

    assert.ok(readFileMock.mock.calls.every(call => path.basename(String(call.arguments[0])) !== ".env.local"))
    assert.equal(fs.readFileSync(filename, "utf8"), options.diskSource ?? source)
    if (example !== null) assert.equal(fs.readFileSync(path.join(root, ".env.example"), "utf8"), example)
    return verification
  } finally {
    readFileMock?.mock.restore()
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("accepts the example's order and blank lines between groups", () => {
  const source = declarations("      SITE_URL: string\n\n      R2_BUCKET: string\n      R2_KEY: string")
  assert.deepEqual(lintExample("SITE_URL=''\n\n# Storage\nR2_BUCKET=''\nR2_KEY=''\n", source).messages, [])
})

test("moves declarations with their comments and preserves optional and union types", () => {
  const example = "FIRST_KEY=''\n\nSECOND_KEY=''\n"
  const source = declarations(
    "      // Describes the second key.\n      SECOND_KEY?: 'a' | 'b' // Inline comment.\n      FIRST_KEY: string",
  )
  const expected = declarations(
    "      FIRST_KEY: string\n\n      // Describes the second key.\n      SECOND_KEY?: 'a' | 'b' // Inline comment.",
  )
  const checked = lintExample(example, source, { fix: true })
  assert.equal(checked.output, expected)
  assert.deepEqual(checked.messages, [])
  assert.equal(lintExample(example, expected, { fix: true }).fixed, false)
})

test("adds multiple missing declarations in one fix without changing other interfaces", () => {
  const example = "FIRST_KEY=''\nSECOND_KEY=''\n\nTHIRD_KEY=''\n"
  const footer = "\ninterface OtherInterface { keep: number }\n"
  const source = declarations("      THIRD_KEY: 'existing'") + footer
  const checked = lintExample(example, source, { fix: true })
  assert.equal(checked.output, declarations(
    "      FIRST_KEY: string\n      SECOND_KEY: string\n\n      THIRD_KEY: 'existing'",
  ) + footer)
  assert.deepEqual(checked.messages, [])
})

test("matches double blank lines in the example and removes spacing within a group", () => {
  const example = "FIRST_KEY=''\nSECOND_KEY=''\n\n\n# New group\nTHIRD_KEY=''\n"
  const source = declarations("      FIRST_KEY: string\n\n      SECOND_KEY: string\n      THIRD_KEY: string")
  const checked = lintExample(example, source)
  assert.deepEqual(checked.messages.map(message => message.messageId), ["groupSpacing"])
  assert.equal(lintExample(example, source, { fix: true }).output, declarations(
    "      FIRST_KEY: string\n      SECOND_KEY: string\n\n\n      THIRD_KEY: string",
  ))
})

test("reads exported assignments and ignores commented declarations", () => {
  const example = "# UNUSED_KEY=''\nexport FIRST_KEY='' # Comment\nSECOND_KEY='a value'\n"
  assert.deepEqual(lintExample(example, declarations("      FIRST_KEY: string\n      SECOND_KEY: string")).messages, [])
})

test("reports extra declarations for review and preserves their contents", () => {
  const source = declarations("      EXTRA_KEY: 'keep'\n      FIRST_KEY: string")
  const checked = lintExample("FIRST_KEY=''\n", source, { fix: true })
  assert.equal(checked.output, source)
  assert.ok(checked.messages.some(message => message.messageId === "extraDeclaration"))
  assert.ok(checked.messages.every(message => !message.fix))
})

test("reports duplicate example assignments without picking one value or rewriting files", () => {
  const source = declarations("      FIRST_KEY: string")
  const checked = lintExample("FIRST_KEY='first'\nFIRST_KEY='second'\n", source, { fix: true })
  assert.equal(checked.output, source)
  assert.deepEqual(checked.messages.map(message => message.messageId), ["duplicateExample"])
})

test("duplicate example assignments still allow declaration order and spacing fixes", () => {
  const example = "SITE_URL=''\n\nR2_ACCOUNT_ID=''\nR2_ACCESS_KEY_ID=''\nR2_SECRET_ACCESS_KEY=''\n"
    + "\nSTORAGE_PROVIDER=''\nR2_ACCOUNT_ID='another value'\nR2_ACCESS_KEY_ID=''\nR2_SECRET_ACCESS_KEY=''\n"
  const source = declarations(
    "      SITE_URL: string\n\n      STORAGE_PROVIDER: string\n      R2_ACCOUNT_ID: string\n"
      + "      R2_ACCESS_KEY_ID: string\n      R2_SECRET_ACCESS_KEY: string",
  )
  const expected = declarations(
    "      SITE_URL: string\n\n      R2_ACCOUNT_ID: string\n      R2_ACCESS_KEY_ID: string\n"
      + "      R2_SECRET_ACCESS_KEY: string\n\n      STORAGE_PROVIDER: string",
  )
  const checked = lintExample(example, source, { fix: true })
  assert.equal(checked.output, expected)
  assert.deepEqual(checked.messages.map(message => message.messageId), Array(3).fill("duplicateExample"))
  assert.equal(lintExample(example, expected, { fix: true }).fixed, false)
})

test("reports duplicate declarations without discarding a type", () => {
  const source = declarations("      FIRST_KEY: string\n      FIRST_KEY: 'special'")
  const checked = lintExample("FIRST_KEY=''\n", source, { fix: true })
  assert.equal(checked.output, source)
  assert.deepEqual(checked.messages.map(message => message.messageId), ["duplicateDeclaration"])
})

test("checks the editor text rather than a stale declaration file", () => {
  const example = "FIRST_KEY=''\nSECOND_KEY=''\n"
  const checked = lintExample(example, declarations("      SECOND_KEY: string\n      FIRST_KEY: string"), {
    diskSource: declarations("      FIRST_KEY: string\n      SECOND_KEY: string"),
  })
  assert.deepEqual(checked.messages.map(message => message.messageId), ["wrongOrder"])
})

test("preserves multiline property types and trailing interface comments", () => {
  const example = "FIRST_KEY=''\nSECOND_KEY=''\n"
  const source = declarations(
    "      SECOND_KEY: {\n        nested: string\n      }\n      FIRST_KEY: string\n      // Keep this final comment.",
  )
  const checked = lintExample(example, source, { fix: true })
  assert.equal(checked.output, declarations(
    "      FIRST_KEY: string\n      SECOND_KEY: {\n        nested: string\n      }\n      // Keep this final comment.",
  ))
  assert.deepEqual(checked.messages, [])
})

test("leaves index signatures and scope-wide ESLint directives for manual review", () => {
  for (const prefix of ["      [name: string]: string\n", "      // eslint-disable no-unused-vars\n"]) {
    const source = declarations(prefix + "      SECOND_KEY: string\n      FIRST_KEY: string")
    const checked = lintExample("FIRST_KEY=''\nSECOND_KEY=''\n", source, { fix: true })
    assert.equal(checked.output, source)
    assert.ok(checked.messages.some(message => message.messageId === "wrongOrder"))
    assert.ok(checked.messages.every(message => !message.fix))
  }
})

test("keeps eslint-disable-next-line comments attached to the declaration they describe", () => {
  const source = declarations(
    "      // eslint-disable-next-line local-rules/no-defined-unused-envs -- Used by CI.\n      SECOND_KEY: string\n      FIRST_KEY: string",
  )
  const checked = lintExample("FIRST_KEY=''\n\nSECOND_KEY=''\n", source, { fix: true })
  assert.equal(checked.output, declarations(
    "      FIRST_KEY: string\n\n      // eslint-disable-next-line local-rules/no-defined-unused-envs -- Used by CI.\n      SECOND_KEY: string",
  ))
  assert.deepEqual(checked.messages, [])
})

test("preserves CRLF line endings", () => {
  const example = "FIRST_KEY=''\r\n\r\nSECOND_KEY=''\r\n"
  const source = declarations("      SECOND_KEY: string\n      FIRST_KEY: string").replaceAll("\n", "\r\n")
  assert.equal(lintExample(example, source, { fix: true }).output, declarations(
    "      FIRST_KEY: string\n\n      SECOND_KEY: string",
  ).replaceAll("\n", "\r\n"))
})

test("editor saves preserve the example's group spacing when Prettier is enabled", async () => {
  const example = "FIRST_KEY=''\n\n\nSECOND_KEY=''\n"
  const source = declarations("      SECOND_KEY: string\n      FIRST_KEY: string")
  const expected = declarations("      FIRST_KEY: string\n\n\n      SECOND_KEY: string")
  const filename = path.join(__dirname, "..", "env.d.ts")
  const fileInfo = await prettier.getFileInfo(filename, { ignorePath: path.join(__dirname, "..", ".prettierignore") })
  const config = await prettier.resolveConfig(filename)

  async function save(contents) {
    const fixed = lintExample(example, contents, { fix: true })
    assert.deepEqual(fixed.messages, [])
    return fileInfo.ignored ? fixed.output : prettier.format(fixed.output, { ...config, filepath: filename })
  }

  const firstSave = await save(source)
  assert.equal(firstSave, expected)
  assert.equal(await save(firstSave), firstSave)
})

test("ignores other files and missing examples", () => {
  const source = declarations("      SECOND_KEY: string\n      FIRST_KEY: string")
  for (const filename of ["other.d.ts", "nested/env.d.ts"]) {
    assert.deepEqual(lintExample("FIRST_KEY=''\nSECOND_KEY=''\n", source, { filename }).messages, [])
  }
  assert.deepEqual(lintExample(null, source).messages, [])
})
