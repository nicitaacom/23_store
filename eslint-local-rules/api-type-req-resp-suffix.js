"use strict"

function normalizePath(filename) {
  return filename.replaceAll("\\", "/")
}

function isApiNamespaceFile(filename) {
  const normalizedFilename = normalizePath(filename)
  return normalizedFilename.endsWith("/api.d.ts")
}

module.exports = {
  "api-type-req-resp-suffix": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require API namespace request/response type aliases to use Req/Resp suffixes",
      },
      schema: [],
      messages: {
        useReq: 'Use "{{suggested}}" instead of "{{name}}" for API request types.',
        useResp: 'Use "{{suggested}}" instead of "{{name}}" for API response types.',
      },
    },
    create(context) {
      if (!isApiNamespaceFile(context.filename)) return {}

      function reportBadSuffix(idNode) {
        const name = idNode.name

        if (name.endsWith("Request")) {
          context.report({
            node: idNode,
            messageId: "useReq",
            data: { name, suggested: `${name.slice(0, -"Request".length)}Req` },
          })
        } else if (name.endsWith("Response")) {
          context.report({
            node: idNode,
            messageId: "useResp",
            data: { name, suggested: `${name.slice(0, -"Response".length)}Resp` },
          })
        }
      }

      return {
        TSTypeAliasDeclaration(node) {
          reportBadSuffix(node.id)
        },
        TSInterfaceDeclaration(node) {
          reportBadSuffix(node.id)
        },
      }
    },
  },
}
