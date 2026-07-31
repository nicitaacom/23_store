"use strict"

function isZustandCreateCall(node) {
  return node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "create"
}

// Finds the object literal(s) a zustand store actually returns: either create<T>()({ ... }) /
// create<T>({ ... }) directly, or create<T>()((set, get) => ({ ... })) /
// create<T>()(function (set, get) { return { ... } }).
function findZustandStoreObjectLiterals(programNode) {
  const objectLiterals = []

  function visit(node) {
    if (!node || typeof node.type !== "string") return

    const isCreateCall = isZustandCreateCall(node) || (node.type === "CallExpression" && isZustandCreateCall(node.callee))
    if (isCreateCall) {
      for (const arg of node.arguments) {
        if (arg.type === "ObjectExpression") {
          objectLiterals.push(arg)
        } else if (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") {
          if (arg.body.type === "ObjectExpression") {
            objectLiterals.push(arg.body)
          } else if (arg.body.type === "BlockStatement") {
            for (const statement of arg.body.body) {
              if (statement.type === "ReturnStatement" && statement.argument && statement.argument.type === "ObjectExpression") {
                objectLiterals.push(statement.argument)
              }
            }
          }
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "parent") continue
      const value = node[key]
      if (Array.isArray(value)) {
        value.forEach(visit)
      } else if (value && typeof value.type === "string") {
        visit(value)
      }
    }
  }

  visit(programNode)
  return objectLiterals
}

module.exports = { findZustandStoreObjectLiterals }
