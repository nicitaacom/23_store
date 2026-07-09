"use strict"

// Rule 15: ABSOLUTELY NO ANY FUNCTIONS IN DEPS.
// Never add a locally-defined function (useCallback-wrapped, plain function declaration, or a
// handleXxx/fetchXxx returned from another hook) to a useCallback/useMemo/useEffect deps array -
// even if currently memoized/stable, a later change to its own deps can silently make it unstable.
// useState setters and zustand store actions are exempt (stable by contract); every other local
// function identifier in a deps array is flagged.
const HOOK_NAMES = new Set(["useCallback", "useMemo", "useEffect", "useLayoutEffect"])

function isDepsArrayHookCall(node) {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    HOOK_NAMES.has(node.callee.name) &&
    node.arguments.length >= 2 &&
    node.arguments[node.arguments.length - 1].type === "ArrayExpression"
  )
}

// Matches this codebase's own handler-naming convention (handleXxx/fetchXxx) so destructured hook
// results are only treated as functions when the name itself says so - we can't know from syntax
// alone whether an arbitrary destructured property (e.g. `food` from a zustand store) is a
// function or a plain value, so guessing broadly caused false positives on data fields.
const HANDLER_NAME_PATTERN = /^(handle|fetch)[A-Z]/

function findLocalFunctionDeclarations(scopeManager) {
  const localFunctionNames = new Set()
  for (const scope of scopeManager.scopes) {
    for (const variable of scope.variables) {
      for (const definition of variable.defs) {
        const isFunctionDeclaration = definition.type === "FunctionName"

        const isDirectBinding = definition.type === "Variable" && definition.name.parent.type === "VariableDeclarator"
        const initNode = isDirectBinding ? definition.node.init : null
        const isDirectCallbackOrFunction =
          isDirectBinding &&
          initNode &&
          ((initNode.type === "CallExpression" &&
            initNode.callee.type === "Identifier" &&
            initNode.callee.name === "useCallback") ||
            initNode.type === "ArrowFunctionExpression" ||
            initNode.type === "FunctionExpression")

        const isDestructuredHandler =
          definition.type === "Variable" &&
          definition.name.parent.type === "Property" &&
          HANDLER_NAME_PATTERN.test(variable.name)

        if (isFunctionDeclaration || isDirectCallbackOrFunction || isDestructuredHandler) {
          localFunctionNames.add(variable.name)
        }
      }
    }
  }
  return localFunctionNames
}

module.exports = {
  "no-function-in-deps": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow locally-defined functions in useCallback/useMemo/useEffect deps arrays",
      },
      schema: [],
      messages: {
        noFunctionInDeps:
          "Do not put the locally-defined function \"{{name}}\" in a deps array - hold it in a ref instead (setEntityRedisRef.current = setEntityRedis pattern) so a later change to its own deps can't silently destabilize this hook.",
      },
    },
    create(context) {
      const sourceCode = context.getSourceCode()
      let localFunctionNames = null

      return {
        Program() {
          localFunctionNames = findLocalFunctionDeclarations(sourceCode.scopeManager)
        },
        CallExpression(node) {
          if (!isDepsArrayHookCall(node)) return

          const depsArray = node.arguments[node.arguments.length - 1]
          for (const element of depsArray.elements) {
            if (!element || element.type !== "Identifier") continue
            const name = element.name
            // useState setters are set* by convention and are exempt; zustand actions are typically
            // verbs (set/upd/insert/...) destructured from a store hook - also exempt by convention.
            if (/^set[A-Z]/.test(name)) continue
            if (localFunctionNames.has(name)) {
              context.report({ node: element, messageId: "noFunctionInDeps", data: { name } })
            }
          }
        },
      }
    },
  },
}
