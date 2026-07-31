"use strict"

// `req.json()` already rejects on invalid JSON. Chaining `.catch(...)` onto that parse site hides
// the real failure and encourages noisy wrappers like `(await req.json().catch(() => ({})))`.
// If bad JSON is a real branch, handle it with a surrounding try/catch around the await instead
// of swallowing the parse error inline.
module.exports = {
  "no-req-json-catch": {
    meta: {
      type: "suggestion",
      docs: {
        description: "disallow req.json().catch(...) wrappers; use a normal surrounding try/catch instead",
      },
      schema: [],
      messages: {
        noReqJsonCatch:
          'Avoid `req.json().catch(...)` - await `req.json()` directly, and if invalid JSON is a real branch, handle it with a surrounding try/catch instead of swallowing the parse failure here.',
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          const catchCallee = node.callee
          if (catchCallee.type !== "MemberExpression") return
          if (catchCallee.property.type !== "Identifier" || catchCallee.property.name !== "catch") return

          const jsonCall = catchCallee.object
          if (jsonCall.type !== "CallExpression") return

          const jsonCallee = jsonCall.callee
          if (jsonCallee.type !== "MemberExpression") return
          if (jsonCallee.property.type !== "Identifier" || jsonCallee.property.name !== "json") return
          if (jsonCallee.object.type !== "Identifier" || jsonCallee.object.name !== "req") return

          context.report({ node: catchCallee.property, messageId: "noReqJsonCatch" })
        },
      }
    },
  },
}
