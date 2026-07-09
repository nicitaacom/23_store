"use strict"

// Zustand selector-style usage (useStore(state => state.value)) is banned in this codebase -
// always destructure the whole store instead:
//   .tsx components: const { value, action } = useStore()
//   .ts (non-component) files: const { value, action } = useStore.getState()
// A store hook is identified by its import source containing "store" or "zustand" (not by name
// alone) - this avoids misfiring on an unrelated hook that happens to be named similarly but
// takes a legitimate callback argument (useMemo, useCallback, useEffect, etc. are all imported
// from "react", never from a path containing "store"/"zustand").
function isStoreImportSource(source) {
  return /store/i.test(source) || /zustand/i.test(source)
}

module.exports = {
  "no-zustand-selector": {
    meta: {
      type: "suggestion",
      docs: {
        description: 'disallow zustand selector-style usage (useStore(state => state.value)) - destructure the whole store instead',
      },
      schema: [],
      messages: {
        noSelector:
          '"{{name}}" looks like a zustand store hook (imported from "{{source}}") - don\'t select a slice with a callback. Destructure the whole store instead: "const { value } = {{name}}()" in a component, or "{{name}}.getState()" in a non-component file.',
      },
    },
    create(context) {
      const storeHookImports = new Map()

      return {
        ImportDeclaration(node) {
          if (!isStoreImportSource(node.source.value)) return
          for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportDefaultSpecifier" && specifier.type !== "ImportSpecifier") continue
            // zustand's own `create` (and `createStore`) factory is imported from "zustand" itself
            // (matches isStoreImportSource) but is never a store HOOK being selector-called - it's
            // the function used to define one (create<T>()((set, get) => ({ ... }))).
            if (specifier.local.name === "create" || specifier.local.name === "createStore") continue
            storeHookImports.set(specifier.local.name, node.source.value)
          }
        },
        CallExpression(node) {
          if (node.callee.type !== "Identifier") return
          const name = node.callee.name
          if (!storeHookImports.has(name)) return
          if (node.arguments.length === 0) return

          const firstArg = node.arguments[0]
          if (firstArg.type !== "ArrowFunctionExpression" && firstArg.type !== "FunctionExpression") return

          context.report({
            node,
            messageId: "noSelector",
            data: { name, source: storeHookImports.get(name) },
          })
        },
      }
    },
  },
}
