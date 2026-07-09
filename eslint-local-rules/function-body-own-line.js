"use strict"

// A function whose body does real multi-line work (more than one statement, or a single `return`
// of an object/array literal with more than one property/element) must have its opening `{` as
// the last token on the signature line - nothing else (like `return (` or the first statement)
// crammed onto that same line.
// Wrong:   function extractUTMParams(params = {}) { return ({
// Correct: function extractUTMParams(params = {}) {
//            return {
//              ...
//            }
//          }
// A trivial single-statement body (function foo() { return 1 }) is exempt regardless of
// formatting - this rule only kicks in once the body is substantial enough that splitting it
// across lines actually helps readability.
function isMultiPropertyLiteral(node) {
  if (!node) return false
  if (node.type === "ObjectExpression") return node.properties.length > 1
  if (node.type === "ArrayExpression") return node.elements.length > 1
  return false
}

function isSubstantialBody(blockStatement) {
  if (blockStatement.body.length > 1) return true
  if (blockStatement.body.length === 1) {
    const onlyStatement = blockStatement.body[0]
    if (onlyStatement.type === "ReturnStatement") return isMultiPropertyLiteral(onlyStatement.argument)
  }
  return false
}

module.exports = {
  "function-body-own-line": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require a substantial function body's opening { to be the last token on the signature line",
      },
      schema: [],
      messages: {
        bodyNotOnOwnLine:
          "This function's body does real multi-line work - its opening \"{\" should be the last thing on the signature line, with the body starting on the next line.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      function checkFunction(node) {
        if (!node.body || node.body.type !== "BlockStatement") return
        const block = node.body

        if (!isSubstantialBody(block)) return

        const openBraceToken = sourceCode.getFirstToken(block)
        const nextToken = sourceCode.getTokenAfter(openBraceToken)
        if (!nextToken) return

        if (openBraceToken.loc.end.line === nextToken.loc.start.line) {
          context.report({ node: openBraceToken, messageId: "bodyNotOnOwnLine" })
        }
      }

      return {
        FunctionDeclaration: checkFunction,
        FunctionExpression: checkFunction,
        ArrowFunctionExpression: checkFunction,
      }
    },
  },
}
