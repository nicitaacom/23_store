"use strict"

const path = require("path")

// "shared", "widgets", "features", "libs", "components", and "api" folders hold things meant to
// be broadly re-usable (or, for libs/api, are flat SDK-client/route files with no meaningful
// "relative within" concept) - the opposite of a same-directory or feature-local relative import.
// Importing one via a relative path ("../shared/useToast", "../../features/backup/BackupSDK")
// hides that intent: it reads like the target is feature-local, when it's actually meant to be
// reached the same way @/store/*, @/widgets/*, @/components/* already are.
//
// Two matching modes:
//   - ANYWHERE_BUCKETS: match as a path segment anywhere (e.g. app/store/shared/useToast.ts AND
//     app/components/shared/Input.tsx both count as "shared" - there's more than one legitimate
//     "shared" folder in this project, so this can't be root-anchored).
//   - ROOT_ANCHORED_BUCKETS: match only when the import resolves into that exact top-level
//     app/<bucket>/... directory - "components" specifically is also a common folder name inside
//     individual feature/page folders (e.g. app/(jobs)/jobs-CMS/components/Modals/...), which is
//     normal same-feature organization, not the global app/components/ - root-anchoring avoids
//     flagging those.
//
// Exception: a relative import from a file that is ITSELF already inside the same top-level
// bucket (e.g. app/features/backup/useDbBackup.ts importing "../BackupSDK" from the same
// app/features/backup/ folder) is fine - that's normal same-feature file organization, not
// reaching into a different re-usable bucket from outside it. This mirrors how
// no-cross-route-group-absolute-import exempts same-group imports. "libs"/"api" have no meaningful
// same-bucket relative-import pattern in practice, so this exception rarely applies to them.
const ANYWHERE_BUCKETS = ["shared", "widgets", "features", "libs"]
const ROOT_ANCHORED_BUCKETS = ["components", "api"]

function isRelativeImport(source) {
  return source.startsWith("../") || source === ".." || source.startsWith("./") || source === "."
}

// Returns the restricted bucket name for an app-relative segment array (e.g.
// ["store", "shared", "useToast"] or ["components", "shared", "Input"]), else null.
function findRestrictedBucket(segments) {
  const anywhereMatch = ANYWHERE_BUCKETS.find(bucket => segments.includes(bucket))
  if (anywhereMatch) return anywhereMatch

  const rootMatch = ROOT_ANCHORED_BUCKETS.find(bucket => segments[0] === bucket)
  if (rootMatch) return rootMatch

  return null
}

function findAppRoot(filename) {
  let dir = path.dirname(filename)
  for (let i = 0; i < 20; i++) {
    try {
      require("fs").accessSync(path.join(dir, "tsconfig.json"))
      return path.join(dir, "app")
    } catch {
      const parent = path.dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  }
  return null
}

module.exports = {
  "require-absolute-import-for-shared-folders": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description:
          'require @/ absolute imports (not relative ../ or ./) for anything under a "shared", "widgets", "features", "libs", "components", or "api" folder, from outside that same bucket',
      },
      schema: [],
      messages: {
        useAbsoluteImport:
          '"{{source}}" resolves into a "{{bucket}}" folder - that\'s meant to be broadly re-usable, so import it via "{{suggested}}" instead of a relative path.',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const appRoot = findAppRoot(filename)
      if (!appRoot) return {}

      const currentSegments = path.relative(appRoot, filename).split(path.sep)
      const currentBucket = findRestrictedBucket(currentSegments)

      return {
        ImportDeclaration(node) {
          const source = node.source.value
          if (!isRelativeImport(source)) return

          const resolved = path.resolve(path.dirname(filename), source)
          const relativeToApp = path.relative(appRoot, resolved)
          const importSegments = relativeToApp.split(path.sep)
          const importBucket = findRestrictedBucket(importSegments)
          if (!importBucket) return

          // Exempt same-bucket imports (e.g. a file inside app/features/backup/ importing
          // another file inside app/features/backup/ via a relative path).
          if (importBucket === currentBucket) return

          const suggested = `@/${importSegments.join("/")}`

          context.report({
            node: node.source,
            messageId: "useAbsoluteImport",
            data: { source, bucket: importBucket, suggested },
            fix(fixer) {
              return fixer.replaceText(node.source, `"${suggested}"`)
            },
          })
        },
      }
    },
  },
}
