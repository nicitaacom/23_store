"use strict"

// const response = await someSDKMethod(...)          - the awaited call is an update/insert/delete
// const somethingResp = await someSDKMethod(...)      - the awaited call is a select/get
//   (e.g. const selectDBLabelsResp = await selectDBLabels(...))
// Applies to any awaited call, not just this codebase's own selectDB*/getRedis*/etc. helpers -
// including SDK method calls (messagesSDK.selectTickets(...) -> selectTicketsResp, using just the
// method name, not the object prefix). Read/write is classified from the method/function name's
// own leading verb; a name that doesn't start with a recognized verb at all is not flagged (not
// enough information to guess), so this only catches vague names on calls whose own name already
// tells you what kind of operation it is.
const READ_VERB_PATTERN = /^(select|get|fetch|hgetall|find)[A-Z]/
const WRITE_VERB_PATTERN = /^(insert|update|upd|delete|del|set|create|add|hadd|hdel|hupd|push|remove|increase|decrease|toggle|upload|download|import|export)[A-Z]/

// Testing Library queries (getByRole, findByRole, getAllByText, findAllByTestId, ...) - same
// reasoning as the getSupabaseServer/getI18n exclusions below: the result is already named for what
// it holds (the matched element), not for the read verb the query happens to start with.
const TESTING_LIBRARY_QUERY_PATTERN = /^(get|find)(All)?By[A-Z]/

// Names that are never an acceptable awaited-result name regardless of the read/write suggestion -
// these are the generic placeholders being specifically banned (result, data, res, something, etc.)
const ALWAYS_VAGUE_NAMES = new Set(["result", "results", "data", "res", "something", "output", "value", "response2"])

// Calls that match READ_VERB_PATTERN by name shape but aren't this codebase's own SDK/DB/Redis
// read convention at all - a factory/client getter (getSupabaseServer) or a built-in Web API
// (Response.json(), createImageBitmap) whose result is properly named for what it holds, not for
// the "read" verb in the method name. getI18n/getScopedI18n are excluded too: the awaited result
// is the translate function itself, always called `t` throughout this codebase (t("some.key")) -
// renaming it to getI18nResp would force renaming every t(...) call site for no readability gain.
const EXCLUDED_METHOD_NAMES = new Set(["getSupabaseServer", "json", "createImageBitmap", "getCookie", "getI18n", "getScopedI18n"])

function getCalleeMethodName(callee) {
  if (callee.type === "Identifier") return callee.name
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") return callee.property.name
  return null
}

module.exports = {
  "response-variable-naming": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require awaited call results to be named response (write) or <methodName>Resp (read)",
      },
      schema: [],
      messages: {
        readShouldBeResp: 'Awaited result of "{{fnName}}" (a read) should be named "{{suggested}}", not "{{name}}".',
        writeShouldBeResponse:
          'Awaited result of "{{fnName}}" (a write) should be named "response" or "{{suggested}}" (e.g. "ticketsResp"), not "{{name}}".',
        vagueAwaitedName:
          'Awaited result of "{{fnName}}" should be named "response" (write) or "{{fnName}}Resp" (read), not the vague name "{{name}}".',
      },
    },
    create(context) {
      return {
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier") return
          if (!node.init || node.init.type !== "AwaitExpression") return
          const awaited = node.init.argument
          if (awaited.type !== "CallExpression") return

          const fnName = getCalleeMethodName(awaited.callee)
          if (!fnName || EXCLUDED_METHOD_NAMES.has(fnName) || TESTING_LIBRARY_QUERY_PATTERN.test(fnName)) return
          const name = node.id.name
          const suggested = fnName + "Resp"

          if (READ_VERB_PATTERN.test(fnName)) {
            if (name !== suggested && name !== "response") {
              context.report({ node: node.id, messageId: "readShouldBeResp", data: { fnName, suggested, name } })
            }
            return
          }

          if (WRITE_VERB_PATTERN.test(fnName)) {
            // a write accepts "response" or ANY <domainWord>Resp name (e.g. "ticketsResp"), not
            // just the exact method name + Resp - only reject a bare vague placeholder, checked
            // against the domain word with the Resp suffix stripped off (so "dataResp" is still
            // caught as vague, same as bare "data" would be)
            const endsInResp = /[a-z]Resp$/.test(name)
            const domainWord = endsInResp ? name.slice(0, -"Resp".length) : name
            const isVaguePlaceholder = ALWAYS_VAGUE_NAMES.has(domainWord.toLowerCase())
            if (name !== "response" && (!endsInResp || isVaguePlaceholder)) {
              context.report({ node: node.id, messageId: "writeShouldBeResponse", data: { fnName, suggested, name } })
            }
            return
          }

          // fnName doesn't start with a recognized verb - we can't tell read vs write, but a
          // generic placeholder name is still wrong regardless of which one it is
          if (ALWAYS_VAGUE_NAMES.has(name.toLowerCase())) {
            context.report({ node: node.id, messageId: "vagueAwaitedName", data: { fnName, name } })
          }
        },
      }
    },
  },
}
