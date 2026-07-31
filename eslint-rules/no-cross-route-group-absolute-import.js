"use strict"

const path = require("path")

// A "route group" is a Next.js App Router folder like app/(admin), app/(site), app/(auth) - the
// parens are stripped from the URL but still group files on disk. Importing another file in the
// SAME route group via its absolute @/(group)/... path is unnecessary indirection: a relative
// ../ import says "this is local to my own feature area", while the @/(group)/... form reads as
// if it were reaching across the project the same way @/store/* or @/libs/* would - which is
// misleading when it's actually right next door. Only same-group absolute imports are flagged;
// importing @/(other-group)/... or a group-less @/... path is unaffected.
const ROUTE_GROUP_PATTERN = /^@\/(\([^)/]+\))\//

function getRouteGroupFromFilename(filename) {
  const normalized = filename.split(path.sep).join("/")
  const match = normalized.match(/\/app\/(\([^)/]+\))\//)
  return match ? match[1] : null
}

function getRouteGroupFromImportSource(source) {
  const match = source.match(ROUTE_GROUP_PATTERN)
  return match ? match[1] : null
}

module.exports = {
  "no-cross-route-group-absolute-import": {
    meta: {
      type: "suggestion",
      docs: {
        description: "flag @/(group)/... imports used from a file already inside that same route group - use a relative ../ import instead",
      },
      schema: [],
      messages: {
        useRelativeImport:
          'This file is already inside {{group}} - import "{{source}}" via a relative ../ path instead of repeating the {{group}} route group in an absolute @/ import.',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const currentGroup = getRouteGroupFromFilename(filename)
      if (!currentGroup) return {}

      return {
        ImportDeclaration(node) {
          const source = node.source.value
          const importGroup = getRouteGroupFromImportSource(source)
          if (importGroup && importGroup === currentGroup) {
            context.report({
              node,
              messageId: "useRelativeImport",
              data: { source, group: currentGroup },
            })
          }
        },
      }
    },
  },
}
