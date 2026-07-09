"use strict"

// Hook naming convention (checked against the file's basename, since these hooks are always their
// own file in this codebase):
//   useSomethingStore - zustand store WITH persist
//   useSomething       - zustand store WITHOUT persist, or a plain hook (useDebounce, etc.)
//   useSetSomething    - sets a value into state; may return isSkeleton
//   useSomethingHandlers - returns only functions, except isLocalLoading/localError
//   useAutoUpdateSomething - useEffect-only hook (no handler functions returned)
// Resolves what an Identifier's binding was actually initialized with, so `return { handleFoo }`
// (shorthand) can be traced back to `const handleFoo = () => {...}` / `useCallback(...)`.
function resolveIdentifierInitType(identifierNode, scopeManager) {
  for (const scope of scopeManager.scopes) {
    const variable = scope.variables.find(item => item.name === identifierNode.name)
    if (!variable) continue
    for (const definition of variable.defs) {
      if (definition.type === "FunctionName") return "FunctionDeclaration"
      if (definition.type === "Variable" && definition.node.init) {
        const init = definition.node.init
        if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") return init.type
        if (init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "useCallback") {
          return "ArrowFunctionExpression"
        }
        return init.type
      }
    }
  }
  return null
}

function getExportedReturnProperties(programNode, scopeManager) {
  const returnProperties = []
  function walk(node) {
    if (!node || typeof node.type !== "string") return
    if (node.type === "ReturnStatement" && node.argument && node.argument.type === "ObjectExpression") {
      for (const property of node.argument.properties) {
        if (property.type !== "Property" || property.key.type !== "Identifier") continue

        const valueType = property.shorthand
          ? resolveIdentifierInitType(property.value, scopeManager)
          : property.value.type

        returnProperties.push({ name: property.key.name, valueType })
      }
    }
    for (const key in node) {
      if (key === "parent") continue
      const value = node[key]
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value.type === "string") walk(value)
    }
  }
  walk(programNode)
  return returnProperties
}

// Best-effort passthrough check: a handleXxx function whose entire body is a single call to a
// store setter (set*(...)) with no await/if/try is likely a trivial passthrough that belongs
// directly in the zustand store instead of this hook - per the user's stated rule, only promote a
// setter into a handlers hook once it does real work (validation, an SDK/API call, branching,
// error handling). This is a heuristic, not proof - a deliberately simple handler that's still
// correct SRP will also match; suppress with a comment if it fires on a genuine one.
function isTrivialPassthroughBody(fnNode) {
  const body = fnNode.body
  if (!body || body.type !== "BlockStatement") return false
  if (body.body.length !== 1) return false

  const statement = body.body[0]
  if (statement.type !== "ExpressionStatement") return false
  const expression = statement.expression
  if (expression.type !== "CallExpression" || expression.callee.type !== "Identifier") return false

  return /^set[A-Z]/.test(expression.callee.name)
}

function findHandleFunctionBodies(programNode, scopeManager, handleNames) {
  const bodies = []
  function walk(node) {
    if (!node || typeof node.type !== "string") return
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "Identifier" &&
      handleNames.has(node.id.name) &&
      node.init
    ) {
      const fnNode =
        node.init.type === "CallExpression" && node.init.callee.name === "useCallback" ? node.init.arguments[0] : node.init
      if (fnNode && (fnNode.type === "ArrowFunctionExpression" || fnNode.type === "FunctionExpression")) {
        bodies.push({ name: node.id.name, fnNode })
      }
    }
    for (const key in node) {
      if (key === "parent") continue
      const value = node[key]
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value.type === "string") walk(value)
    }
  }
  walk(programNode)
  return bodies
}

function fileText(sourceCode) {
  return sourceCode.getText()
}

module.exports = {
  "hook-naming-convention": {
    meta: {
      type: "suggestion",
      docs: {
        description: "enforce useSomethingStore/useSetSomething/useSomethingHandlers/useAutoUpdateSomething shape matches the file name",
      },
      schema: [],
      messages: {
        storeMissingPersist: 'File name ends in "Store" but no persist(...) call was found - use plain "useSomething" naming (no Store suffix) for a non-persisted zustand store.',
        nonStoreHasPersist: 'File calls persist(...) but the file name doesn\'t end in "Store" - rename to "useSomethingStore" for a persisted zustand store.',
        handlersReturnsNonFunction:
          '"{{name}}" hook file should return only functions (handlers) - found "{{prop}}" which is not a function. Exceptions: isLocalLoading, localError.',
        handlersReturnsNonHandleName:
          '"{{name}}" is a *Handlers hook - the returned function "{{prop}}" should be named handleXxx (e.g. handleDeleteSmth, handleHupdSmth), not "{{prop}}".',
        handlersFileHasNoHandlers:
          '"{{name}}" is a *Handlers hook file but exports no handleXxx-named function - a handlers hook must contain at least one handler (e.g. handleDelete, handleHupdSomething).',
        autoUpdateReturnsHandlers:
          '"{{name}}" is a useAutoUpdateSomething hook (useEffect-only) - it should not return handler functions like "{{prop}}".',
        trivialPassthroughHandler:
          '"{{name}}" only calls a store setter with no validation/API call/branching - it\'s not a handler, it\'s a plain store action. Define it directly inside the zustand store instead (use get() there if it needs the current value), and destructure it straight from the store in the component. Suppress this if the handler is deliberately this simple and still does real work.',
        setFileWrongReturn:
          '"{{name}}" is a useSetXxx hook - it should only return isSkeleton/is*Skeleton and/or refetch* (e.g. refetchMailboxes), not "{{prop}}".',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const basename = filename.split("/").pop().replace(/\.tsx?$/, "")

      const isStoreFile = /Store$/.test(basename) && /^use/.test(basename)
      const isHandlersFile = /Handlers$/.test(basename) && /^use/.test(basename)
      const isAutoUpdateFile = /^useAutoUpdate/.test(basename)
      const isSetFile = /^useSet[A-Z]/.test(basename)

      return {
        Program(node) {
          const sourceCode = context.sourceCode ?? context.getSourceCode()
          const text = fileText(sourceCode)
          const callsPersist = /\bpersist\s*\(/.test(text) && /from\s+["']zustand\/middleware["']/.test(text)
          const callsCreate = /from\s+["']zustand["']/.test(text) && /\bcreate(<[^>]*>)?\s*\(/.test(text)

          if (callsCreate && isStoreFile && !callsPersist) {
            context.report({ node, messageId: "storeMissingPersist" })
          }
          if (callsCreate && callsPersist && !isStoreFile) {
            context.report({ node, messageId: "nonStoreHasPersist" })
          }

          if (isHandlersFile || isAutoUpdateFile) {
            const returnProperties = getExportedReturnProperties(node, sourceCode.scopeManager)
            const exemptNames = new Set(["isLocalLoading", "localError"])
            let hasHandleNamedReturn = false

            for (const { name, valueType } of returnProperties) {
              // valueType is null when we couldn't resolve what the identifier was bound to
              // (e.g. destructured from a hook call) - not enough information to flag safely
              const isFunctionValue =
                valueType === null || valueType === "ArrowFunctionExpression" || valueType === "FunctionExpression" || valueType === "FunctionDeclaration"
              if (!isFunctionValue) {
                if (exemptNames.has(name)) continue
                if (isHandlersFile) {
                  context.report({ node, messageId: "handlersReturnsNonFunction", data: { name: basename, prop: name } })
                } else if (isAutoUpdateFile) {
                  context.report({ node, messageId: "autoUpdateReturnsHandlers", data: { name: basename, prop: name } })
                }
                continue
              }

              if (isHandlersFile && /^handle[A-Z]/.test(name)) hasHandleNamedReturn = true
              if (isHandlersFile && !/^handle[A-Z]/.test(name)) {
                context.report({ node, messageId: "handlersReturnsNonHandleName", data: { name: basename, prop: name } })
              }
            }

            if (isHandlersFile && !hasHandleNamedReturn) {
              context.report({ node, messageId: "handlersFileHasNoHandlers", data: { name: basename } })
            }

            if (isHandlersFile) {
              const handleNames = new Set(returnProperties.filter(prop => /^handle[A-Z]/.test(prop.name)).map(prop => prop.name))
              for (const { name, fnNode } of findHandleFunctionBodies(node, sourceCode.scopeManager, handleNames)) {
                if (isTrivialPassthroughBody(fnNode)) {
                  context.report({ node: fnNode, messageId: "trivialPassthroughHandler", data: { name } })
                }
              }
            }
          }

          if (isSetFile) {
            const returnProperties = getExportedReturnProperties(node, sourceCode.scopeManager)
            for (const { name } of returnProperties) {
              const isAllowedName = /^is[A-Z]\w*Skeleton$/.test(name) || name === "isSkeleton" || /^refetch[A-Z]/.test(name)
              if (!isAllowedName) {
                context.report({ node, messageId: "setFileWrongReturn", data: { name: basename, prop: name } })
              }
            }
          }
        },
      }
    },
  },
}
