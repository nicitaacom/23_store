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
// it to a `function` + explicit `return` adds lines without adding clarity.
//
// A zustand store file is exempt entirely (any top-level arrow const, including the common
// `const someStore = (set) => ({ ... })` factory pattern) - detected by the file path containing
// "store"/"zustand", or the file calling zustand's `create(`. This matches the community-standard
// zustand shape (`export const useXStore = create((set) => ({ ... }))`) instead of forcing every
// store factory into `function someStore(set) { return {...} }`.
function isHookName(name) {
  return /^use[A-Z]/.test(name)
}

function isExemptOneLinerArrow(node) {
  if (node.type !== "ArrowFunctionExpression") return false
  return node.body.type !== "BlockStatement" && node.body.type !== "ObjectExpression"
}

function isZustandStoreFile(filename, sourceCode) {
  const lowerPath = filename.toLowerCase()
  if (lowerPath.includes("store") || lowerPath.includes("zustand")) return true
  return /\bcreate\s*[<(]/.test(sourceCode.getText())
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
      const filename = context.filename ?? context.getFilename()
      const sourceCode = context.sourceCode ?? context.getSourceCode()
      const isStoreFile = isZustandStoreFile(filename, sourceCode)

      return {
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return
          const isArrowOrFunctionExpr = node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression"
          if (!isArrowOrFunctionExpr) return

          const name = node.id.name
          if (isHookName(name)) return
          if (isInsideFunctionBody(node)) return
          if (isExemptOneLinerArrow(node.init)) return
          if (isStoreFile) return

          context.report({ node: node.id, messageId: "arrowNotHook", data: { name } })
        },
      }
    },
  },
}
