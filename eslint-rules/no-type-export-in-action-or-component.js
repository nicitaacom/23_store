"use strict"

// Rule 7: type files - never export a type/interface from a component or a server action file.
// Types belong in their own dedicated file (e.g. TMyType.ts), not alongside component/action logic.
// Detected by filename convention: a component file is PascalCase and default-exports JSX (.tsx),
// an action file matches *Action.ts / lives under an "actions" directory, or has "use server".
function isComponentFile(filename, sourceCode) {
  if (!filename.endsWith(".tsx")) return false
  const basename = filename.split("/").pop().replace(/\.tsx$/, "")
  if (!/^[A-Z]/.test(basename)) return false
  return /return\s*\(?\s*</.test(sourceCode.getText()) || /<[A-Z]/.test(sourceCode.getText())
}

function isActionFile(filename, sourceCode) {
  const basename = filename.split("/").pop()
  if (/Action\.ts$/.test(basename)) return true
  if (/\/actions\//.test(filename)) return true
  if (/^\s*["']use server["']/.test(sourceCode.getText())) return true
  return false
}

module.exports = {
  "no-type-export-in-action-or-component": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow exporting a type/interface from a component or server action file",
      },
      schema: [],
      messages: {
        typeInWrongFile:
          'Move "{{name}}" to its own type file (e.g. {{name}}.ts) instead of exporting it from this {{kind}} file.',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()

      return {
        Program(node) {
          const sourceCode = context.sourceCode ?? context.getSourceCode()
          const isComponent = isComponentFile(filename, sourceCode)
          const isAction = isActionFile(filename, sourceCode)
          if (!isComponent && !isAction) return

          const kind = isComponent ? "component" : "server action"

          for (const statement of node.body) {
            if (statement.type !== "ExportNamedDeclaration" || !statement.declaration) continue
            if (
              statement.declaration.type === "TSTypeAliasDeclaration" ||
              statement.declaration.type === "TSInterfaceDeclaration"
            ) {
              // a component's own Props type is expected to live alongside it - that's the
              // established convention here, not a violation
              if (isComponent && /Props$/.test(statement.declaration.id.name)) continue

              context.report({
                node: statement.declaration,
                messageId: "typeInWrongFile",
                data: { name: statement.declaration.id.name, kind },
              })
            }
          }
        },
      }
    },
  },
}
