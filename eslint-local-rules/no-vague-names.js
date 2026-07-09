"use strict"

// Rule 13: absolutely no short/vague variable names like `e`, `err`, `idx` - use `error`/`index`
// instead. Exception: `e` is allowed for DOM/React event parameters.
const VAGUE_NAMES = new Set(["err", "idx", "res", "req", "val", "obj", "arr", "elem", "tmp", "num", "str", "ct", "fn", "cb"])

function isEventParamName(node) {
  return node.name === "e"
}

function isEventHandlerParam(node) {
  // e in (e) => ... / function(e) - allowed only as a function parameter, matching the codebase's
  // documented exception "(exception is e for event)"
  const parent = node.parent
  if (!parent) return false
  if (parent.type === "ArrowFunctionExpression" || parent.type === "FunctionExpression") {
    return parent.params.includes(node)
  }
  return false
}

// True when node is an Identifier binding reached by walking into a destructuring pattern
// (ArrayPattern elements, ObjectPattern property values/shorthand, nested combinations) whose
// outermost pattern is a declarator id, a function param, or a catch clause param - so
// `const [k, v] = ...`, `([k, v]) => ...`, and `const { a: { b } } = ...` are all covered, not just
// a bare identifier directly in that position.
function isBindingIdentifier(node) {
  let current = node
  let parent = node.parent
  while (parent) {
    if (parent.type === "ArrayPattern" && parent.elements.includes(current)) {
      current = parent
      parent = parent.parent
      continue
    }
    if (parent.type === "ObjectPattern") {
      const isPropertyValue = parent.properties.some(property => property.type === "Property" && property.value === current)
      if (isPropertyValue) {
        current = parent
        parent = parent.parent
        continue
      }
      return false
    }
    if (parent.type === "AssignmentPattern" && parent.left === current) {
      current = parent
      parent = parent.parent
      continue
    }
    break
  }

  if (!parent) return false
  if (parent.type === "VariableDeclarator" && parent.id === current) return true
  if ((parent.type === "ArrowFunctionExpression" || parent.type === "FunctionExpression") && parent.params.includes(current)) return true
  if (parent.type === "CatchClause" && parent.param === current) return true
  return false
}

module.exports = {
  "no-vague-names": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow short/vague identifier names like e, err, idx (except e for events)",
      },
      schema: [],
      messages: {
        vagueName: 'Avoid the vague name "{{name}}" - use a descriptive name (e.g. "error", "index") instead.',
      },
    },
    create(context) {
      return {
        Identifier(node) {
          // only check binding positions (declarations/params/destructuring), not every reference,
          // to avoid reporting the same short name at every call site
          if (!isBindingIdentifier(node)) return

          if (isEventParamName(node) && isEventHandlerParam(node)) return
          // `_` is the standard intentional-discard placeholder (e.g. `(_, index) => ...`), not a
          // vague name someone forgot to write out - only flag it as a param when it's re-read
          if (node.name === "_") return
          if (node.name.length === 1 || VAGUE_NAMES.has(node.name.toLowerCase())) {
            context.report({ node, messageId: "vagueName", data: { name: node.name } })
          }
        },
      }
    },
  },
}
