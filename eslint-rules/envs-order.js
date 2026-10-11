"use strict"

const fs = require("fs")
const path = require("path")
const { findRepoRoot } = require("./utils/findRepoRoot")

// .env.example is the source of truth for names, order and blank lines between groups.
// Read only that example; private environment files are not needed for this check.
// A missing declaration gets a string type. Existing declarations keep their types and comments.
// Extra names and duplicate entries are reported for review instead of being deleted.
// Repeated example names use their first position; ordering declarations never selects env values.
// Fixes replace only the ProcessEnv body through ESLint, including in an unsaved editor buffer.

function readExample(examplePath) {
  let lines
  try {
    lines = fs.readFileSync(examplePath, "utf8").split(/\r?\n/)
  } catch {
    return null
  }

  const entries = []
  const duplicates = []
  const names = new Set()
  let blankRun = 0
  let blankLinesBefore = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      blankRun += 1
      blankLinesBefore = Math.max(blankLinesBefore, blankRun)
      continue
    }
    blankRun = 0

    const match = /^(?:export\s+)?([A-Za-z_$][\w$]*)\s*=/.exec(trimmed)
    if (!match) continue
    if (names.has(match[1])) duplicates.push(match[1])
    else entries.push({ name: match[1], blankLinesBefore: entries.length ? blankLinesBefore : 0 })
    names.add(match[1])
    blankLinesBefore = 0
  }
  return { entries, duplicates }
}

function declarationName(member) {
  if (member.type !== "TSPropertySignature" || member.computed) return null
  if (member.key.type === "Identifier") return member.key.name
  return member.key.type === "Literal" && typeof member.key.value === "string" ? member.key.value : null
}

function readDeclarations(sourceCode, interfaceNode) {
  const body = interfaceNode.body
  const declarations = []
  let previousEnd = body.range[0] + 1
  let previousLine = body.loc.start.line
  let isFixable = true

  for (const member of body.body) {
    const name = declarationName(member)
    if (!name) {
      isFixable = false
      continue
    }
    const comments = sourceCode.getCommentsBefore(member).filter(
      comment => comment.range[0] >= previousEnd && comment.loc.start.line > previousLine,
    )
    const firstLine = comments[0]?.loc.start.line ?? member.loc.start.line
    const start = sourceCode.getIndexFromLoc({ line: firstLine, column: 0 })
    const lastLineText = sourceCode.lines[member.loc.end.line - 1]
    const end = sourceCode.getIndexFromLoc({ line: member.loc.end.line, column: lastLineText.length })
    const prefix = sourceCode.lines[firstLine - 1].slice(0, comments[0]?.loc.start.column ?? member.loc.start.column)
    const suffix = lastLineText.slice(member.loc.end.column)

    // Shared lines, unfamiliar body content and comments across a declaration boundary need review.
    if (start < previousEnd || prefix.trim() || sourceCode.text.slice(previousEnd, start).trim()) isFixable = false
    if (!/^\s*(?:\/\/.*|\/\*.*\*\/\s*)?$/.test(suffix)) isFixable = false

    declarations.push({ name, node: member, text: sourceCode.text.slice(start, end) })
    previousEnd = end
    previousLine = member.loc.end.line
  }

  const closingLine = sourceCode.lines[body.loc.end.line - 1]
  const closingIndent = closingLine.slice(0, body.loc.end.column - 1)
  if (declarations.length && closingIndent.trim()) isFixable = false

  // Keep trailing comments in place. Scope-wide ESLint directives also stay for manual review.
  const tail = sourceCode.text.slice(previousEnd, body.range[1] - 1)
  const hasScopedDirective = sourceCode.getAllComments().some(
    comment => comment.range[0] > body.range[0] && comment.range[1] < body.range[1]
      && /^\s*eslint-(?:disable|enable)(?!-next-line)/.test(comment.value),
  )
  if (hasScopedDirective) isFixable = false

  const interfaceIndent = sourceCode.lines[interfaceNode.loc.start.line - 1].match(/^\s*/)[0]
  const indent = declarations[0]?.text.match(/^\s*/)[0] ?? interfaceIndent + "  "
  return {
    declarations,
    isFixable,
    indent,
    closingIndent: declarations.length ? closingIndent : interfaceIndent,
    tail: tail.trim() ? tail : null,
  }
}

function orderedBody(sourceCode, parsed, entries) {
  const newline = sourceCode.text.includes("\r\n") ? "\r\n" : "\n"
  const byName = new Map(parsed.declarations.map(declaration => [declaration.name, declaration]))
  const contents = entries.map(
    entry => newline.repeat(entry.blankLinesBefore + 1)
      + (byName.get(entry.name)?.text ?? parsed.indent + entry.name + ": string"),
  ).join("")
  return contents + (parsed.tail ?? newline + parsed.closingIndent)
}

module.exports = {
  "envs-order": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: { description: "match ProcessEnv names, order and group spacing to .env.example" },
      schema: [],
      messages: {
        missingDeclaration: '.env.example lists "{{name}}"; add its declaration to ProcessEnv. Run eslint --fix to match the example.',
        extraDeclaration: 'ProcessEnv declares "{{name}}" without a matching .env.example entry. Add the example entry or remove the declaration after reviewing its uses.',
        duplicateExample: '.env.example lists "{{name}}" more than once. Declaration order follows its first entry; keep one assignment in .env.example.',
        duplicateDeclaration: 'ProcessEnv declares "{{name}}" more than once. Keep one declaration after reviewing its type and comments.',
        wrongOrder: '"{{name}}" is out of order; .env.example puts "{{expectedName}}" at this position. Run eslint --fix to match the example.',
        groupSpacing: "Match the blank lines between ProcessEnv groups to .env.example. Run eslint --fix to match the example.",
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      if (path.basename(filename) !== "env.d.ts") return {}

      const repoRoot = findRepoRoot(filename)
      if (repoRoot === null || path.resolve(filename) !== path.join(repoRoot, "env.d.ts")) return {}

      const example = readExample(path.join(repoRoot, ".env.example"))
      if (example === null) return {}
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      return {
        TSInterfaceDeclaration(node) {
          if (node.id.name !== "ProcessEnv" || node.parent?.parent?.id?.name !== "NodeJS") return
          for (const name of new Set(example.duplicates)) {
            context.report({ node, messageId: "duplicateExample", data: { name } })
          }
          const parsed = readDeclarations(sourceCode, node)
          const names = new Set()
          const duplicateDeclarations = []
          for (const declaration of parsed.declarations) {
            if (names.has(declaration.name)) duplicateDeclarations.push(declaration)
            names.add(declaration.name)
          }
          for (const declaration of duplicateDeclarations) {
            context.report({ node: declaration.node, messageId: "duplicateDeclaration", data: { name: declaration.name } })
          }

          const exampleNames = new Set(example.entries.map(entry => entry.name))
          const missing = example.entries.filter(entry => !names.has(entry.name))
          const extra = parsed.declarations.filter(declaration => !exampleNames.has(declaration.name))
          const shared = parsed.declarations.filter(declaration => exampleNames.has(declaration.name))
          const sharedExample = example.entries.filter(entry => names.has(entry.name))
          const wrongIndex = shared.findIndex((declaration, index) => declaration.name !== sharedExample[index]?.name)
          const isFixable = parsed.isFixable && !extra.length && !duplicateDeclarations.length
          const expectedBody = isFixable ? orderedBody(sourceCode, parsed, example.entries) : null
          const fix = isFixable ? fixer => fixer.replaceTextRange([node.body.range[0] + 1, node.body.range[1] - 1], expectedBody) : null

          for (const entry of missing) {
            context.report({ node, messageId: "missingDeclaration", data: { name: entry.name }, fix })
          }
          for (const declaration of extra) {
            context.report({ node: declaration.node, messageId: "extraDeclaration", data: { name: declaration.name } })
          }
          if (wrongIndex !== -1 && !duplicateDeclarations.length) {
            context.report({
              node: shared[wrongIndex].node,
              messageId: "wrongOrder",
              data: { name: shared[wrongIndex].name, expectedName: sharedExample[wrongIndex].name },
              fix,
            })
          }
          if (!missing.length && !extra.length && !duplicateDeclarations.length && wrongIndex === -1 && isFixable) {
            const currentBody = sourceCode.text.slice(node.body.range[0] + 1, node.body.range[1] - 1)
            if (currentBody !== expectedBody) context.report({ node: node.body, messageId: "groupSpacing", fix })
          }
        },
      }
    },
  },
}
