"use strict"

// This codebase's debug-logging convention: console.log(<line-number>, ...) where the first
// argument is a numeric literal marking which line the call itself sits on (a poor-man's
// log-source marker, so a log line in the terminal can be traced back to the exact call site
// without a stack trace). The number silently goes stale the moment code is inserted/removed
// above the call and shifts its line - this rule checks the literal against the call's real
// node.loc.start.line and autofixes it back in sync.
//
// Bad (this console.log is really on line 40):
//   console.log(30, "user", user)
// Good:
//   console.log(40, "user", user)
module.exports = {
  "console-log-line-number": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description: "keep console.log(<line-number>, ...) first-argument literals in sync with the call's actual line",
      },
      schema: [],
      messages: {
        staleLineNumber:
          'console.log\'s first argument is {{literal}}, but this call is actually on line {{actualLine}} - update the literal to match.',
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          const callee = node.callee
          if (callee.type !== "MemberExpression") return
          if (callee.object.type !== "Identifier" || callee.object.name !== "console") return
          if (callee.property.type !== "Identifier" || callee.property.name !== "log") return

          const firstArg = node.arguments[0]
          if (!firstArg || firstArg.type !== "Literal" || typeof firstArg.value !== "number") return

          const actualLine = node.loc.start.line
          if (firstArg.value === actualLine) return

          context.report({
            node: firstArg,
            messageId: "staleLineNumber",
            data: { literal: String(firstArg.value), actualLine: String(actualLine) },
            fix(fixer) {
              return fixer.replaceText(firstArg, String(actualLine))
            },
          })
        },
      }
    },
  },
}
