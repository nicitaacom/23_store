"use strict"

// Rule 9: NEVER export const with classNames.
// Flags `export const foo = "...tailwind classes..."` (top-level string/template literal exports
// whose value looks like a className list) - these should stay inline in the component using them.
function looksLikeClassNameString(value) {
  if (typeof value !== "string") return false
  if (!value.trim()) return false
  // heuristic: 2+ space-separated tokens, each token looks like a class name (letters/digits/-/:/[]/%)
  const tokens = value.trim().split(/\s+/)
  if (tokens.length < 2) return false
  return tokens.every(token => /^[a-zA-Z0-9\-:/[\].%!_#]+$/.test(token))
}

module.exports = {
  "no-export-const-classname": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow exporting a const holding a className string",
      },
      schema: [],
      messages: {
        noExportClassName:
          "Do not export a const containing className strings - keep className values inline in the component that uses them.",
      },
    },
    create(context) {
      return {
        ExportNamedDeclaration(node) {
          if (!node.declaration || node.declaration.type !== "VariableDeclaration") return

          for (const declarator of node.declaration.declarations) {
            if (!declarator.init) continue

            const initNode = declarator.init
            const isTemplateWithClassNames =
              initNode.type === "TemplateLiteral" &&
              initNode.quasis.some(quasi => looksLikeClassNameString(quasi.value.raw))
            const isStringWithClassNames = initNode.type === "Literal" && looksLikeClassNameString(initNode.value)

            if (isStringWithClassNames || isTemplateWithClassNames) {
              context.report({ node: declarator, messageId: "noExportClassName" })
            }
          }
        },
      }
    },
  },
}
