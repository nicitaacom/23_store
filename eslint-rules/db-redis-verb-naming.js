"use strict"

// selectDB/insertDB/updateDB/deleteDB - Supabase; getRedis/setRedis/updRedis/delRedis - Redis.
// Only checks the "named like a DB/Redis call but its body doesn't actually call one" direction -
// the reverse (any function that happens to call Supabase/Redis must be named selectDB*/etc.) was
// tried and dropped: this codebase calls Supabase directly inside page/layout/component functions
// and route handlers (GET/POST) and uses other established helper suffixes (e.g. `...InDBAction`),
// so flagging every such call site as "wrong name" was mostly false positives, not real violations.
// Body-text scanning can't see through helper functions it calls - if this misfires on a real edge
// case, add `// eslint-disable-next-line local-rules/db-redis-verb-naming` with a short comment
// explaining the naming choice.
const DB_PREFIX_PATTERN = /^(selectDB|insertDB|updateDB|deleteDB)/
const REDIS_PREFIX_PATTERN = /^(getRedis|setRedis|updRedis|delRedis)/

function bodyCallsSupabase(bodyText) {
  // Postgrest query builder (`.from(table).select/insert/update/delete/upsert(...)`) or the
  // Storage API (`.storage.from(bucket).upload/download/remove(...)`)
  const callsQueryBuilder = /\.from\(/.test(bodyText) && /\.(select|insert|update|delete|upsert)\(/.test(bodyText)
  const callsStorageApi = /\.storage\.from\(/.test(bodyText) && /\.(upload|download|remove|list|move|copy)\(/.test(bodyText)
  return callsQueryBuilder || callsStorageApi
}

function bodyCallsRedis(bodyText) {
  return /\bredis\.(get|set|hget|hset|hdel|del|hgetall)/i.test(bodyText)
}

function getFunctionNameAndBody(node, sourceCode) {
  if (node.type === "FunctionDeclaration" && node.id) {
    return { name: node.id.name, bodyText: sourceCode.getText(node.body) }
  }
  if (
    node.type === "VariableDeclarator" &&
    node.id.type === "Identifier" &&
    node.init &&
    (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression")
  ) {
    return { name: node.id.name, bodyText: sourceCode.getText(node.init.body) }
  }
  return null
}

module.exports = {
  "db-redis-verb-naming": {
    meta: {
      type: "suggestion",
      docs: {
        description: "flag a function named selectDB*/insertDB*/updateDB*/deleteDB*/getRedis*/setRedis*/updRedis*/delRedis* whose body doesn't call the matching client",
      },
      schema: [],
      messages: {
        dbPrefixButNoDbCall:
          '"{{name}}" is named like a Supabase call but its body has no .from(...).select/insert/update/delete/upsert or .storage.from(...) call - if this is intentional, add // eslint-disable-next-line local-rules/db-redis-verb-naming with a short reason.',
        redisPrefixButNoRedisCall:
          '"{{name}}" is named like a Redis call but its body has no redis.get/set/hget/hset/hdel/del call - if this is intentional, add // eslint-disable-next-line local-rules/db-redis-verb-naming with a short reason.',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      function check(node) {
        const info = getFunctionNameAndBody(node, sourceCode)
        if (!info) return
        const { name, bodyText } = info

        const hasDbPrefix = DB_PREFIX_PATTERN.test(name)
        const hasRedisPrefix = REDIS_PREFIX_PATTERN.test(name)

        if (hasDbPrefix && !bodyCallsSupabase(bodyText)) {
          context.report({ node, messageId: "dbPrefixButNoDbCall", data: { name } })
        } else if (hasRedisPrefix && !bodyCallsRedis(bodyText)) {
          context.report({ node, messageId: "redisPrefixButNoRedisCall", data: { name } })
        }
      }

      return {
        FunctionDeclaration: check,
        VariableDeclarator: check,
      }
    },
  },
}
