"use strict"

// Rule 4: @ts-ignore is only for dynamic (runtime) Supabase table names - a static table name
// never needs it (supabaseServer().from("metrics") typechecks fine on its own). Flags a
// `// @ts-ignore` comment unless the very next line's `.from(...)` call argument is NOT a plain
// string literal (i.e. it's a template literal or a variable - a genuinely dynamic table name).
function nextLineText(comment, sourceCode) {
  const nextToken = sourceCode.getTokenAfter(comment, { includeComments: false })
  if (!nextToken) return null
  return sourceCode.lines[nextToken.loc.start.line - 1] ?? ""
}

function isDynamicFromCall(lineText) {
  const fromCallMatch = /\.from\((.+?)\)/.exec(lineText)
  if (!fromCallMatch) return false
  const argument = fromCallMatch[1].trim()
  // a plain string literal ("..." or '...') is static - anything else (template literal, variable,
  // function call) is dynamic
  const isStaticStringLiteral = /^["'][^"'`]*["']$/.test(argument)
  return !isStaticStringLiteral
}

module.exports = {
  "ts-ignore-dynamic-table-only": {
    meta: {
      type: "problem",
      docs: {
        description: "restrict @ts-ignore to dynamic Supabase table name calls only",
      },
      schema: [],
      messages: {
        notDynamicTableCall:
          '"// @ts-ignore" is reserved for dynamic (runtime) Supabase table names, e.g. supabaseServer().from(`emails-${domain}`) - a static table name typechecks fine without it, and this comment does not precede a .from(...) call with a dynamic argument.',
      },
    },
    create(context) {
      return {
        Program() {
          const sourceCode = context.sourceCode ?? context.getSourceCode()
          for (const comment of sourceCode.getAllComments()) {
            if (!/^\s*@ts-ignore\b/.test(comment.value)) continue

            const lineText = nextLineText(comment, sourceCode)
            if (lineText === null || !isDynamicFromCall(lineText)) {
              context.report({ node: comment, messageId: "notDynamicTableCall" })
            }
          }
        },
      }
    },
  },
}
