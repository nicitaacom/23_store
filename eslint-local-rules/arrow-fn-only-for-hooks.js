"use strict"

// Rule 16: arrow functions are ONLY allowed for defining a hook itself, OR a local const declared
// inside another function's body.
// Bad:  const DbBackupModal = () => { ... }        (component as arrow const, MODULE top-level)
//       const someFn = () => { ... }                (plain helper as arrow const, MODULE top-level)
// Good: export function DbBackupModal() { ... }      (components/plain functions use `function`)
//       const setEntityRedis = useCallback(async (url) => { ... }, [])   (arrow passed AS AN ARGUMENT is fine)
//       export const useKeyboardHoursNavigation = () => { ... }          (hook const is fine)
//       useEffect(() => {
//         const listener = (event: KeyboardEvent) => handleKeyDownRef.current(event)   (local const inside a function body is fine)
//         document.addEventListener("keydown", listener)
//         return () => document.removeEventListener("keydown", listener)
//       }, [])
//
// Only checks a top-level (module-scope) `const x = () => {}` / `const x = function () {}`
// binding - an arrow function passed as an argument to another call (useCallback, useMemo,
// .map(), addEventListener, JSX inline handlers, etc.) is never flagged, since those aren't
// "defining a function under a name" the same way a top-level const is. A `const x = () => {}`
// declared INSIDE another function/hook/component body is also exempt - it's already scoped to
// that one function, not a module-wide export, so the same "components/helpers should use
// `function`" concern doesn't apply to it.
//
// A one-liner arrow with a concise/expression body (no `{}` block, implicit return - e.g.
// `const clamp = (v, min, max) => Math.max(min, Math.min(max, v))`) is exempt too - converting
// it to a `function` + explicit `return` adds lines without adding clarity. This does NOT cover
// a concise body that returns an object literal (`const store = (set) => ({ ... })`), since those
// tend to hold many properties/methods and read the same as a real function body.
function isHookName(name) {
  return /^use[A-Z]/.test(name)
}

function isExemptOneLinerArrow(node) {
  if (node.type !== "ArrowFunctionExpression") return false
  return node.body.type !== "BlockStatement" && node.body.type !== "ObjectExpression"
}

function isInsideFunctionBody(node) {
  let current = node.parent
  while (current) {
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return true
    }
    current = current.parent
  }
  return false
}

module.exports = {
  "arrow-fn-only-for-hooks": {
    meta: {
      type: "suggestion",
      docs: {
        description: "disallow arrow function assigned to a const/let except for hook definitions",
      },
      schema: [],
      messages: {
        arrowNotHook:
          '"{{name}}" is an arrow function but isn\'t a hook (name doesn\'t start with "use") - use a function declaration instead: function {{name}}(...) {...}.',
      },
    },
    create(context) {
      return {
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return
          const isArrowOrFunctionExpr = node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression"
          if (!isArrowOrFunctionExpr) return

          const name = node.id.name
          if (isHookName(name)) return
          if (isInsideFunctionBody(node)) return
          if (isExemptOneLinerArrow(node.init)) return

          context.report({ node: node.id, messageId: "arrowNotHook", data: { name } })
        },
      }
    },
  },
}
