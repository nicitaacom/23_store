"use strict"

const { execFileSync } = require("child_process")
const path = require("path")

// Sort imports by re-usability, most re-usable first, least re-usable last - with two twists:
//   - Within relative (../, ./) and @/ imports, sort by DESCENDING path segment count - more
//     segments means more specific/less reusable, so it sorts LATER. E.g.
//     @/(admin)/components/ui/Inputs/FoodInput (5 segments) comes before
//     @/(admin)/store/useAddFoodStore (3) comes before @/store/ui/useLoading (3) comes before
//     @/libs/pusher (2). Route-group segments like "(admin)" count as a normal segment.
//   - A relative import (../ or ./, any depth) always sorts above every @/ import, since it's
//     project-structure-relative rather than reaching for an absolute path.
//
// Two top-level groups, separated by a required blank line:
//   Group A (external, tiers 1-3): react, then next, then other node_modules packages.
//   Group B (project, tiers 4-7): type imports, then @/widgets/*, then other relative imports
//     (descending depth), then other @/ imports (descending depth).
//
// Tiers:
//   0. side-effect-only imports (no specifiers, e.g. import "./globals.css") - always first, right
//      after "use client"/"use server" and before even react, since these run for their side
//      effect alone and reordering them past a real import can change what's on the page/in scope
//   1. react
//   2. next / next/*
//   3. other node_modules packages (framer-motion, react-icons, recharts, etc.)
//   -- blank line required here --
//   4. type-only imports, relative or @/-absolute (../types/TXxx, @/interfaces/IXxx)
//   5. @/widgets/* absolute imports (reusable, project-agnostic per app/widgets/dev_readme.md)
//   6. other relative imports (../, ./ - any depth), sorted by descending segment count
//   7. other @/ absolute imports, sorted by descending segment count
// Within tier 6 specifically, a single-consumer check (best-effort, uses `grep -rl` from the repo
// root) additionally requires a same-directory (./) import that's ONLY referenced by this one file
// to sort after every reusable relative import. Treating isolation as a complete sort key keeps the
// comparator transitive when same-directory and parent-directory imports are mixed.
function isReactImport(source) {
  return source === "react" || source.startsWith("react/")
}

function isNextImport(source) {
  return source === "next" || source.startsWith("next/")
}

function isNodeModulesImport(source) {
  return !source.startsWith(".") && !source.startsWith("@/") && !isReactImport(source) && !isNextImport(source)
}

function isRelativeImport(source) {
  return source.startsWith("../") || source === ".." || source.startsWith("./") || source === "."
}

function isSameDirectoryImport(source) {
  return source.startsWith("./") || source === "."
}

function isTypeOnlyImportSource(source) {
  return /\/(types|interfaces)\//.test(source) || /\/(T|I)[A-Z]\w*$/.test(source)
}

function isWidgetsImport(source) {
  return source.startsWith("@/widgets/")
}

// Number of path segments, used as the descending-depth sort key for relative and @/ imports.
// Route-group segments like "(admin)" count as a normal segment, same as anything else.
function segmentCount(source) {
  return source.split("/").filter(Boolean).length
}

// The bound local name to judge capitalization from: the default/namespace specifier's name if
// there is one, else the first named specifier's local name. Falls back to null (never treated as
// a component) if the import has no specifiers at all (a side-effect-only import - tier 0 already,
// so this is never actually consulted for one).
function getPrimarySpecifierName(importNode) {
  const defaultOrNamespace = importNode.specifiers.find(
    specifier => specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportNamespaceSpecifier",
  )
  if (defaultOrNamespace) return defaultOrNamespace.local.name
  const firstNamed = importNode.specifiers[0]
  return firstNamed ? firstNamed.local.name : null
}

// A capitalized (PascalCase) bound name reads as a reusable component/class (Button, Modal) - the
// opposite of a camelCase function/hook/util (formatDate, useToast). Within a tier, component
// imports sort after function/hook imports: a component is "the thing being rendered", so it reads
// better placed closer to the same-directory/local imports below it, not mixed in with the
// generic function-style @/ or relative imports above it.
function isComponentName(name) {
  return typeof name === "string" && /^[A-Z]/.test(name)
}

function isSideEffectOnlyImport(importNode) {
  return importNode.specifiers.length === 0
}

function getTier(source, importNode) {
  if (importNode && isSideEffectOnlyImport(importNode)) return 0
  if (isReactImport(source)) return 1
  if (isNextImport(source)) return 2
  if (isNodeModulesImport(source)) return 3
  if (isRelativeImport(source)) {
    if (isTypeOnlyImportSource(source)) return 4
    return 6
  }
  // @/ absolute imports - a type-shaped one (@/interfaces/TXxx, @/(admin)/interfaces/IXxx) sorts
  // with the other type imports (tier 4), same as its relative-import equivalent would
  if (isTypeOnlyImportSource(source)) return 4
  if (isWidgetsImport(source)) return 5
  return 7
}

// Resolves a same-directory (./Xxx) import specifier to an importable default/named identifier to
// grep for, and checks whether anything besides this file (and the target file's own definition)
// references that name. Best-effort: greps for the bare identifier name across the repo root, so
// a name reused by coincidence elsewhere (unrelated component with the same name) will read as
// "not isolated" - that's a false negative (misses a real isolate), not a false positive, so it
// only under-flags, never over-flags.
function isSingleConsumerImport(node, filename) {
  const importedNames = node.specifiers
    .filter(specifier => specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportSpecifier")
    .map(specifier => specifier.local.name)
  if (importedNames.length === 0) return false

  const repoRoot = findRepoRoot(filename)
  if (!repoRoot) return false

  return importedNames.every(name => {
    try {
      const output = execFileSync("grep", ["-rl", "--include=*.ts", "--include=*.tsx", name, repoRoot], {
        encoding: "utf8",
        timeout: 3000,
      })
      const files = output
        .split("\n")
        .filter(Boolean)
        .map(file => path.resolve(file))
      const otherFiles = files.filter(file => file !== path.resolve(filename))
      // otherFiles should be exactly the imported module's own definition file - if more than one
      // other file references this name, it's reused elsewhere, not isolated
      return otherFiles.length <= 1
    } catch {
      // grep exits non-zero when it finds nothing, or the call can fail/time out - treat as
      // "can't prove it's isolated", not as a violation
      return false
    }
  })
}

function findRepoRoot(filename) {
  let dir = path.dirname(filename)
  for (let i = 0; i < 20; i++) {
    try {
      require("fs").accessSync(path.join(dir, "package.json"))
      return dir
    } catch {
      const parent = path.dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  }
  return null
}

module.exports = {
  "imports-order": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description:
          "sort imports by re-usability tier (react/next/deps, blank line, then types/widgets/relative/@/ by descending path depth)",
      },
      schema: [],
      messages: {
        wrongTierOrder:
          'Import "{{source}}" (tier {{tier}}) should come before "{{prevSource}}" (tier {{prevTier}}) - sort imports most re-usable first, least re-usable last (relative and @/ imports sort by descending path depth - more specific paths first).',
        isolatedImportShouldBeLast:
          '"{{source}}" is only imported by this file (not reused elsewhere) - it should sort after other same-directory imports, since it\'s the most specific/local thing being imported here.',
        missingBlankLineBetweenGroups:
          "Add a blank line between external imports (react/next/other packages) and project imports (types/widgets/relative/@/).",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      function getGroup(tier) {
        return tier <= 3 ? "external" : "project"
      }

      function getImportTier(importNode) {
        return getTier(importNode.source.value, importNode)
      }

      // Builds the fixer that rewrites the whole contiguous import block in one go, in correct
      // order, with a blank line inserted between the external and project groups. Reordering a
      // single pair with two small fixers would race (ESLint applies fixes in range order and
      // re-lints), so instead every report for this Program shares one fixer that replaces the
      // entire block spanning the first import through the last - each import's own text (plus any
      // of its own leading comments) is kept verbatim, only order and group spacing change.
      function buildReorderFix(importNodes, correctOrder) {
        return function fix(fixer) {
          const blockStart = importNodes[0].range[0]
          const blockEnd = importNodes[importNodes.length - 1].range[1]

          let prevGroup = null
          const lines = correctOrder.map(importNode => {
            const tier = getImportTier(importNode)
            const group = getGroup(tier)

            const leadingComments = sourceCode.getCommentsBefore(importNode)
            const ownComments = leadingComments.filter(comment => {
              // Only keep a leading comment if it's not trailing on the previous import's line
              // (i.e. it starts its own line) - avoids duplicating shared/separator comments.
              const prevToken = sourceCode.getTokenBefore(comment)
              return !prevToken || prevToken.loc.end.line !== comment.loc.start.line
            })
            const commentText = ownComments.map(comment => sourceCode.getText(comment)).join("\n")
            const importText = sourceCode.getText(importNode)
            const text = commentText ? `${commentText}\n${importText}` : importText

            const needsBlankLineBefore = prevGroup !== null && prevGroup !== group
            prevGroup = group
            return needsBlankLineBefore ? `\n${text}` : text
          })

          return fixer.replaceTextRange([blockStart, blockEnd], lines.join("\n"))
        }
      }

      return {
        Program(node) {
          const filename = context.filename ?? context.getFilename()
          const importNodes = node.body.filter(statement => statement.type === "ImportDeclaration")
          if (importNodes.length < 2) return

          // single-consumer check, computed up front so both the tier pass and the sort below can
          // use it - only within tier 6's same-directory (./) imports. Excludes side-effect-only
          // imports (tier 0, e.g. import "./globals.css") - those aren't tier 6 at all.
          const sameDirectoryImports = importNodes.filter(
            importNode => isSameDirectoryImport(importNode.source.value) && !isSideEffectOnlyImport(importNode),
          )
          const isolationByImport = new Map()
          if (sameDirectoryImports.length >= 2) {
            for (const importNode of sameDirectoryImports) {
              isolationByImport.set(importNode, isSingleConsumerImport(importNode, filename))
            }
          }

          // Correct order: stable sort by tier; within tiers 6/7, descending path depth (more
          // segments = more specific = sorts earlier); within tier 6's same-directory imports,
          // single-consumer ones sort after ones that are reused elsewhere.
          const correctOrder = importNodes
            .map((importNode, originalIndex) => ({ importNode, originalIndex }))
            .sort((a, b) => {
              const tierA = getImportTier(a.importNode)
              const tierB = getImportTier(b.importNode)
              if (tierA !== tierB) return tierA - tierB

              if (tierA === 4) {
                // Imports order by length:
                // Same-directory type imports tie on path depth, e.g.:
                //   import { TCustomizedFoodDataAfterDB } from "@/interfaces/food/TCustomizedFoodDataAfterDB"
                //   import { TIngredientDB } from "@/interfaces/food/TIngredientDB"
                //   import { ICartFood } from "@/interfaces/food/ICartFood"
                // so break the tie by descending imported-name length instead (26 chars, then 13, then 9).
                const nameA = getPrimarySpecifierName(a.importNode) ?? ""
                const nameB = getPrimarySpecifierName(b.importNode) ?? ""
                if (nameA.length !== nameB.length) return nameB.length - nameA.length
                if (nameA !== nameB) return nameA < nameB ? -1 : 1
              }

              if (tierA === 6 || tierA === 7) {
                const isSameDirA = isSameDirectoryImport(a.importNode.source.value)
                const isSameDirB = isSameDirectoryImport(b.importNode.source.value)
                if (tierA === 6) {
                  const isolatedA = isSameDirA && (isolationByImport.get(a.importNode) ?? false)
                  const isolatedB = isSameDirB && (isolationByImport.get(b.importNode) ?? false)
                  if (isolatedA !== isolatedB) return isolatedA ? 1 : -1
                }

                // Capitalization group: a camelCase-bound import (function/hook/util) sorts before
                // a PascalCase-bound import (component) within the same tier - checked before
                // depth, so e.g. @/utils/formatDate (camelCase) sorts before @/components/Modal
                // (PascalCase) even though Modal's path is shallower.
                const isComponentA = isComponentName(getPrimarySpecifierName(a.importNode))
                const isComponentB = isComponentName(getPrimarySpecifierName(b.importNode))
                if (isComponentA !== isComponentB) return isComponentA ? 1 : -1

                // Within the same capitalization group, sort alphabetically by the bound name
                // (not by path depth) - e.g. convertMinutesToHHMM sorts before useToast because
                // "c" < "u", even though useToast's path has more segments.
                const nameA = getPrimarySpecifierName(a.importNode)
                const nameB = getPrimarySpecifierName(b.importNode)
                if (nameA !== nameB && nameA !== null && nameB !== null) {
                  return nameA < nameB ? -1 : 1
                }

                const depthA = segmentCount(a.importNode.source.value)
                const depthB = segmentCount(b.importNode.source.value)
                if (depthA !== depthB) return depthB - depthA

                // Equal depth - fall back to alphabetical by source so the sort is fully
                // deterministic. A same-route-group @/(group)/... tie (see
                // no-cross-route-group-absolute-import) should already be rewritten as a relative
                // import before this ever matters.
                if (a.importNode.source.value !== b.importNode.source.value) {
                  return a.importNode.source.value < b.importNode.source.value ? -1 : 1
                }
              }

              return a.originalIndex - b.originalIndex
            })
            .map(entry => entry.importNode)

          const isAlreadyCorrect = correctOrder.every((importNode, index) => importNode === importNodes[index])

          let missingBlankLine = false
          for (let i = 1; i < importNodes.length; i++) {
            const prevTier = getImportTier(importNodes[i - 1])
            const currentTier = getImportTier(importNodes[i])
            if (getGroup(prevTier) === "external" && getGroup(currentTier) === "project") {
              const blankLinesBetween = importNodes[i].loc.start.line - importNodes[i - 1].loc.end.line
              if (blankLinesBetween < 2) missingBlankLine = true
            }
          }

          if (isAlreadyCorrect && !missingBlankLine) return

          const fix = buildReorderFix(importNodes, correctOrder)

          if (!isAlreadyCorrect) {
            let prevTier = -1
            let prevSource = null
            for (const importNode of importNodes) {
              const source = importNode.source.value
              const tier = getImportTier(importNode)

              const indexInCorrectOrder = correctOrder.indexOf(importNode)
              const indexInOriginal = importNodes.indexOf(importNode)
              if (indexInCorrectOrder !== indexInOriginal) {
                context.report({
                  node: importNode,
                  messageId: "wrongTierOrder",
                  data: { source, tier, prevSource: prevSource ?? "(start of file)", prevTier },
                  fix,
                })
              }

              prevTier = tier
              prevSource = source
            }
          } else if (missingBlankLine) {
            context.report({
              node: importNodes[0],
              messageId: "missingBlankLineBetweenGroups",
              fix,
            })
          }

          if (sameDirectoryImports.length >= 2) {
            const isolationResults = sameDirectoryImports.map(importNode => ({
              importNode,
              isIsolated: isolationByImport.get(importNode),
            }))

            for (let i = 0; i < isolationResults.length; i++) {
              if (!isolationResults[i].isIsolated) continue
              const hasNonIsolatedAfter = isolationResults.slice(i + 1).some(entry => !entry.isIsolated)
              if (hasNonIsolatedAfter) {
                context.report({
                  node: isolationResults[i].importNode,
                  messageId: "isolatedImportShouldBeLast",
                  data: { source: isolationResults[i].importNode.source.value },
                  fix,
                })
              }
            }
          }
        },
      }
    },
  },
}
