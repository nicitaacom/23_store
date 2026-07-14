"use strict"

const path = require("path")

function isRequestBoundFile(filename) {
  const normalizedFilename = filename.split(path.sep).join("/")

  return (
    /(?:^|\/)app\/api\/(?:.+\/)?route\.[cm]?[jt]sx?$/.test(normalizedFilename) ||
    /(?:^|\/)app\/(?:.+\/)?(page|layout)\.[cm]?[jt]sx?$/.test(normalizedFilename) ||
    /(?:^|\/)app\/actions\//.test(normalizedFilename) ||
    /Action\.[cm]?[jt]sx?$/.test(normalizedFilename)
  )
}

function isSupabaseAdminImport(source) {
  return /(?:^|\/)supabaseAdmin(?:\.[cm]?[jt]sx?)?$/.test(source)
}

function getMemberName(memberExpression) {
  if (!memberExpression.computed && memberExpression.property.type === "Identifier") {
    return memberExpression.property.name
  }

  if (memberExpression.computed && memberExpression.property.type === "Literal") {
    return memberExpression.property.value
  }

  return null
}

module.exports = {
  "use-rls-supabase-client": {
    meta: {
      type: "problem",
      docs: {
        description:
          "require supabaseRouteHandler or supabaseServer for request-bound database queries so the caller session reaches Supabase RLS",
      },
      schema: [],
      messages: {
        useRlsClient:
          "Use supabaseRouteHandler() or supabaseServer() for this database query. They forward the caller session so Supabase applies RLS; supabaseAdmin uses the service role and bypasses RLS.",
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      if (!isRequestBoundFile(filename)) return {}

      const supabaseAdminNames = new Set()

      return {
        ImportDeclaration(node) {
          if (!isSupabaseAdminImport(node.source.value)) return

          for (const specifier of node.specifiers) {
            supabaseAdminNames.add(specifier.local.name)
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || node.init?.type !== "Identifier") return
          if (supabaseAdminNames.has(node.init.name)) supabaseAdminNames.add(node.id.name)
        },
        CallExpression(node) {
          if (node.callee.type !== "MemberExpression") return
          if (getMemberName(node.callee) !== "from") return
          if (node.callee.object.type !== "Identifier") return
          if (!supabaseAdminNames.has(node.callee.object.name)) return

          context.report({ node: node.callee, messageId: "useRlsClient" })
        },
      }
    },
  },
}
