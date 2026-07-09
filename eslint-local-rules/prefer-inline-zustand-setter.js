"use strict"

const { findZustandStoreObjectLiterals } = require("./utils/findZustandStoreObjectLiterals")

// A zustand store method whose body is just "return <expr>" (or a single bare expression
// statement) should be collapsed to a one-line arrow function whenever the resulting line fits
// within the project's 130-char max-len limit - don't wrap a trivial single-expression setter in
// a block body/braces just because it happens to call `set(...)`.
// Wrong:
//   setIngredient: data => {
//     set(state => ({
//       ingredient: { ...state.ingredient, ...data },
//     }))
//   },
// Correct (fits in 130 chars once collapsed):
//   setIngredient: data => set(state => ({ ingredient: { ...state.ingredient, ...data } })),
const MAX_LINE_LENGTH = 130

function getBlockBody(node) {
  if (node.type === "ArrowFunctionExpression" && node.body.type === "BlockStatement") return node.body
  if (node.type === "FunctionExpression" && node.body.type === "BlockStatement") return node.body
  return null
}

// Returns the single collapsible expression from a block body, or null if the block isn't a
// single-statement body that could be an implicit-return arrow.
function getCollapsibleExpression(blockBody) {
  if (blockBody.body.length !== 1) return null
  const onlyStatement = blockBody.body[0]
  if (onlyStatement.type === "ReturnStatement") return onlyStatement.argument
  if (onlyStatement.type === "ExpressionStatement") return onlyStatement.expression
  return null
}

// Flattens a multi-line source snippet down to one line by collapsing any run of whitespace
// (including newlines/indentation) into a single space, EXCEPT inside string/template literals -
// their content must be preserved byte-for-byte. Splits the text into "inside a string/template"
// vs "outside" spans using the source's own tokens, so this never touches literal whitespace a
// developer put inside a string on purpose.
function collapseToSingleLine(sourceCode, node) {
  const tokensAndComments = sourceCode.getTokens(node, { includeComments: true })
  const text = sourceCode.getText(node)
  const nodeStart = node.range[0]

  // Ranges (relative to `text`) that must be copied verbatim - string/template literal token spans.
  const verbatimRanges = tokensAndComments
    .filter(token => token.type === "String" || token.type === "Template")
    .map(token => [token.range[0] - nodeStart, token.range[1] - nodeStart])

  function isInsideVerbatimRange(index) {
    return verbatimRanges.some(([start, end]) => index >= start && index < end)
  }

  let result = ""
  let previousWasCollapsedSpace = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (isInsideVerbatimRange(i)) {
      result += char
      previousWasCollapsedSpace = false
      continue
    }
    if (/\s/.test(char)) {
      if (!previousWasCollapsedSpace) {
        result += " "
        previousWasCollapsedSpace = true
      }
      continue
    }
    result += char
    previousWasCollapsedSpace = false
  }

  return result.trim()
}

// Removes a trailing comma that's now immediately followed by a closing bracket once whitespace
// has been collapsed away (e.g. a multi-line object's trailing comma before its own "}" - valid
// there, but not once the object becomes "{ a: 1, }" on one line, which isn't this project's
// style). Only strips a comma directly abutting `}`, `]`, or `)` - never touches a comma that
// still has real content after it.
function stripDanglingTrailingCommas(text) {
  return text.replace(/,(\s*[}\])])/g, "$1")
}

// This project's arrowParens: "avoid" - a single simple identifier param (no type annotation,
// no destructuring, no default) never gets wrapped in parens: "data =>", not "(data) =>".
function formatParams(paramTexts) {
  if (paramTexts.length === 1 && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(paramTexts[0])) {
    return paramTexts[0]
  }
  return `(${paramTexts.join(", ")})`
}

module.exports = {
  "prefer-inline-zustand-setter": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description: "collapse a zustand store method's block body to a one-line arrow function when it fits within the max line length",
      },
      schema: [],
      messages: {
        preferInline:
          '"{{name}}" has a single-statement body that fits on one line ({{length}} chars, under {{maxLength}}) - collapse it to a one-line arrow function instead of a block body.',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      function checkProperty(property) {
        if (property.type !== "Property" || property.key.type !== "Identifier") return
        const value = property.value
        const fn = value.type === "FunctionExpression" || value.type === "ArrowFunctionExpression" ? value : null
        if (!fn) return

        const blockBody = getBlockBody(fn)
        if (!blockBody) return

        const expression = getCollapsibleExpression(blockBody)
        if (!expression) return

        // Build the collapsed one-liner: "key: params => expr" (or "key(params) { ... }" methods
        // become the same arrow form), preserving the property's own indentation. Each piece is
        // individually flattened to one line - the source expression/params may themselves still
        // span multiple lines (e.g. a multi-line object literal argument) - and any trailing
        // comma that was only valid before a multi-line closing bracket is stripped, since it'd
        // otherwise become a dangling "{ a: 1, }" on one line.
        const paramTexts = fn.params.map(param => stripDanglingTrailingCommas(collapseToSingleLine(sourceCode, param)))
        const isObjectLiteralExpr = expression.type === "ObjectExpression"
        const expressionText = stripDanglingTrailingCommas(collapseToSingleLine(sourceCode, expression))
        const arrowBody = isObjectLiteralExpr ? `(${expressionText})` : expressionText
        const isAsync = fn.async ? "async " : ""

        const keyText = collapseToSingleLine(sourceCode, property.key)
        const collapsedLine = `${keyText}: ${isAsync}${formatParams(paramTexts)} => ${arrowBody}`

        const lineStart = sourceCode.lines[property.loc.start.line - 1]
        const indentMatch = lineStart.match(/^\s*/)
        const indent = indentMatch ? indentMatch[0] : ""
        const trailingComma = sourceCode.getTokenAfter(property)
        const hasTrailingComma = trailingComma && trailingComma.value === ","
        const fullLine = `${indent}${collapsedLine}${hasTrailingComma ? "," : ""}`

        if (fullLine.length > MAX_LINE_LENGTH) return

        // Already a one-liner as-is (no block body to collapse in the first place) - nothing to do.
        if (property.loc.start.line === property.loc.end.line) return

        context.report({
          node: property,
          messageId: "preferInline",
          data: { name: keyText, length: String(fullLine.length), maxLength: String(MAX_LINE_LENGTH) },
          fix(fixer) {
            return fixer.replaceText(property, `${collapsedLine}`)
          },
        })
      }

      return {
        Program(node) {
          const objectLiterals = findZustandStoreObjectLiterals(node)
          for (const objectLiteral of objectLiterals) {
            objectLiteral.properties.forEach(checkProperty)
          }
        },
      }
    },
  },
}
