"use strict"

const { execSync } = require("child_process")
const fsModule = require("fs")
const pathModule = require("path")

// Rule 14: no jargon/clever/vivid words in code or comments/docs - use the plainest accurate word.
// This list is NOT exhaustive by the user's own wording ("if a word could confuse a reader, it's
// banned even if not listed") - it only encodes the words explicitly named.
//
// Bad:
//   const orphanedTasks = tasks.filter(task => !task.ownerId) // "orphaned" is banned jargon
// Good:
//   const unassignedTasks = tasks.filter(task => !task.ownerId)
//
// SYNCED WITH ~/.claude/hooks/banned-words-guard.py - that hook is the PreToolUse backstop that
// blocks a Write/Edit before the file lands (it also covers filenames and non-JS docs); this rule
// is the enforcer for CODE, where the AST tells a Response.blob() method call from a variable
// named blob. BANNED_WORDS below holds the same pattern sources in the same order as the hook's
// BANNED list, written as plain strings rather than regex literals so the two files diff line for
// line. Add a word to one, add it to the other.
const BANNED_WORDS = [
  // --- Tier-1 hard bans (CLAUDE.md "never, no exceptions") ---
  { source: "sibling", suggestion: 'say "other named child" / "neighboring file" / "thread email" - name the actual folder or this codebase\'s own term' },
  { source: "exempt(?:ed|ion|ions|s)?", suggestion: 'say "exception" / "skips" / "a free pass"' },
  { source: "blanket-exempts", suggestion: 'say "skips for all" / "an exception applies"' },
  { source: "front door", suggestion: "name what the file actually imports/calls/renders" },
  { source: "promote[sd]?", suggestion: 'say "move" or the actual CRUD verb (update the filepath)' },
  { source: "promotion", suggestion: 'say "move" or the actual CRUD verb' },
  { source: "wrappers?", suggestion: "name what the file actually imports/calls/renders" },
  { source: "wrapped", suggestion: 'name the mechanism: "created via useCallback" / "nested in its own subfolder"' },
  // --- Dead / morbid family ---
  { source: "dead", suggestion: "spell out what is actually unused/unreachable" },
  { source: "kill(?:s|ed|ing)?", suggestion: "state the positive mechanism (stops/ends/replaces)" },
  { source: "died|dies|die", suggestion: 'say "expires"/"migrates" - the positive mechanism' },
  { source: "orphan(?:s|ed)?", suggestion: "spell out what is actually unreferenced/unlinked" },
  { source: "poison(?:s|ed|ing)?", suggestion: "state the positive mechanism (e.g. a stray space makes AWS return InvalidAccessKeyId)" },
  { source: "zombie", suggestion: "state the positive mechanism instead" },
  { source: "haunt(?:s|ed|ing)?", suggestion: "state the positive mechanism instead" },
  { source: "burned", suggestion: "state the positive mechanism instead" },
  { source: "wound", suggestion: "state the positive mechanism instead" },
  { source: "corrupt(?:s|ed|ion)?", suggestion: "say what the value actually is (malformed/invalid), not corrupt" },
  { source: "dirty", suggestion: 'say it concretely: "the input value changed since the last update"' },
  // --- Apology words (NON-NEGOTIABLE) ---
  { source: "sorry", suggestion: "state the fix, never the apology" },
  { source: "apolog(?:y|ies|ize[sd]?|izing)", suggestion: "state the fix, never the apology" },
  { source: "my bad", suggestion: "state the fix, never the apology" },
  { source: "oops", suggestion: "state the fix, never the apology" },
  // --- "can't" / impossibility framing ---
  { source: "can'?t|cannot|never can", suggestion: "state the positive guarantee or the actual mechanism instead" },
  // --- Misc single-word jargon bans ---
  { source: "popups?", suggestion: "name what it actually is (notification/toast/card)" },
  { source: "instructions", suggestion: 'for user-facing AI input, use "prompt"' },
  { source: "(?:is)?saving", suggestion: "say which backend: updating/inserting (Supabase), setting (Redis)" },
  { source: "armed?", suggestion: 'use "enable"/"enabled"' },
  { source: "SDK call", suggestion: 'use "SDK method" or "SDK sends an API request"' },
  { source: "carr(?:y|ies|ying)", suggestion: 'use "sending" or name the real mechanism' },
  { source: "mutates?", suggestion: "use update/upd per the verb table, not the generic CS term" },
  { source: "consume[sd]?", suggestion: 'say "used" / "counts against"' },
  { source: "blobs?", suggestion: "name the real noun (file/buffer/image)" },
  { source: "server attaches", suggestion: "name the real mechanism" },
  { source: "closures?", suggestion: "say what's actually stale/captured, not the bare JS concept" },
  { source: "eval(?:uate[sd]?)?", suggestion: "name what it actually checks/computes/returns" },
  { source: "archiv(?:e[sd]?|ing|al)", suggestion: 'say "exported" or "imported" - name which side of the backup it is' },
  { source: "targets?", suggestion: "name the real noun (file/table/folder/project/bucket)" },
  { source: "has loaded real data|real \\(fetched\\) state", suggestion: "name the actual hook and verb instead" },
  // words with an allowed sense - handled by stripAllowedSenses() before scanning:
  { source: "consumers?", suggestion: 'say "importer(s)" - the file that imports it' },
  { source: "plain", suggestion: "name the real noun/verb for what the thing is" },
  { source: "narrow(?:ed|ing)?", suggestion: "spell out what happens (fine only as TypeScript's type-narrowing term)" },
  { source: "load[s]?", suggestion: "name the actual verb (fetch/select/get/insert/read)" },
  { source: "cached?", suggestion: 'say "userRedis" / "SE keys" - not "cache"' },
]

// Longest source first so "exemption" is reported over "exempt" - same ordering the hook applies.
const COMPILED = BANNED_WORDS.slice()
  .sort((left, right) => right.source.length - left.source.length)
  .map(({ source, suggestion }) => ({ pattern: new RegExp(`\\b(?:${source})\\b`, "i"), suggestion }))

// Remove the genuinely-correct uses so real code and wire values don't trip the ban. Ported
// one-for-one from strip_allowed_senses() in banned-words-guard.py - keep both in step.
function stripAllowedSenses(text) {
  return (
    text
      .replace(/text\/plain/gi, "") // real MIME type
      .replace(/consumer (?:domains?|emails?(?: providers?)?)/gi, "") // Gmail/Outlook, the retail sense
      .replace(/\.blob\s*\(/gi, "") // Response.blob() / toBlob() method call
      .replace(/github\.com\/.*?\/blob\//gi, "") // GitHub's own "view this file" URL segment
      // stdlib deserialize methods literally named load - json.load, yaml.load, torch.load. Only a
      // DOTTED call is a third-party API name; a bare load(...) stays flagged.
      .replace(/\b[A-Za-z_][A-Za-z0-9_]*\.loads?\s*\(/gi, "")
      .replace(/\btype narrow(?:ing|ed)?\b/gi, "") // TypeScript's own term
      .replace(/\beslint-rules\b/gi, "") // folder name, not the word "rules"
      // fetch()'s real RequestInit.cache field + its literal values
      .replace(/\bcache:\s*["'](?:no-cache|no-store|reload|default|force-cache|only-if-cached)["']/gi, "")
      // React's real named export react.cache()
      .replace(/import\s*\{\s*cache\s*\}\s*from\s*["']react["']/gi, "")
      .replace(/\b(?:React|ReactModule)\.cache\s*\(/g, "")
      .replace(/\bcache\s*\(/gi, "")
      .replace(/--cached\b/gi, "") // git's own flag in `git diff --cached`
      // OpenAI's own 503 body, quoted verbatim in fallback copy - a wire value we do not reword
      .replace(/The server had an error while processing your request\. Sorry about that!/g, "")
      .replace(/cannot read propert(?:y|ies)/gi, "") // Node/browser TypeError text
      .replace(/cannot fork/gi, "") // the OS's own errno message
  )
}

// A named import kept at its original, unaliased name (e.g. `import { loadStripe } from
// "@stripe/stripe-js"`) is a THIRD-PARTY library's own naming choice, not ours - flagging
// "loadStripe" is not actionable. An aliased import (`loadStripe as getStripeSDK`) or a
// default/namespace import stays in scope - those are still our own naming decision.
function isExternalPackageSource(source) {
  return !source.startsWith(".") && !source.startsWith("@/")
}

function collectExternalImportNames(programNode) {
  const names = new Set()
  for (const statement of programNode.body) {
    if (statement.type !== "ImportDeclaration" || !isExternalPackageSource(statement.source.value)) continue
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier" && specifier.imported.name === specifier.local.name) names.add(specifier.local.name)
    }
  }
  return names
}

// "LoadFUPresetDropdown" never trips \bload[s]?\b - there's no word boundary between "Load" and
// "FUPresetDropdown" (both are word characters). Same problem for a CAPSLOCK_SNAKE_CASE name like
// "SKIPPED_FILE_SUFFIXES" (underscore is a word character too) or a MIDDLE camelCase segment like
// "isSkippedFile". Splitting the identifier into every camelCase/PascalCase/snake_case word segment
// and re-running EACH one through the same pattern list catches all three shapes without a second
// banned-word list to keep in step.
function splitIdentifierWords(name) {
  return name.split("_").flatMap(chunk => chunk.match(/[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+|[0-9]+/g) ?? [])
}

function textHasBannedWord(text) {
  const probe = `${text}\n${splitIdentifierWords(text).join(" ")}`
  return COMPILED.some(({ pattern }) => pattern.test(probe))
}

function findRepoRoot(filePath) {
  let current = filePath ? pathModule.dirname(pathModule.resolve(filePath)) : ""
  while (current && current !== pathModule.dirname(current)) {
    if (fsModule.existsSync(pathModule.join(current, ".git"))) return current
    current = pathModule.dirname(current)
  }
  return ""
}

// Existing repo file/folder names whose OWN name holds a banned word. Merely REFERENCING one in
// code (an import, a type, a path string) is not a NEW naming decision, so NavbarWrapper.tsx does
// not make every `import NavbarWrapper` an error. Auto-collected from `git ls-files`, so every
// established name is recognized with NO hand-maintained list; a brand-new name coined in this
// write is absent from the set and still trips. Ported from established_repo_names() in
// banned-words-guard.py. Read once per repo root per eslint process.
const establishedNamesByRoot = new Map()

function establishedRepoNames(filePath) {
  const root = findRepoRoot(filePath)
  if (!root) return []
  if (establishedNamesByRoot.has(root)) return establishedNamesByRoot.get(root)

  let names = []
  try {
    const stdout = execSync("git ls-files", { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    const segments = new Set()
    for (const line of stdout.split("\n")) {
      for (const part of line.split("/")) {
        if (!part) continue
        segments.add(part)
        if (part.includes(".")) segments.add(part.slice(0, part.lastIndexOf(".")))
      }
    }
    // longest first so EditMailboxWrapper is removed before Wrapper
    names = [...segments].filter(textHasBannedWord).sort((left, right) => right.length - left.length)
  } catch {
    names = []
  }
  establishedNamesByRoot.set(root, names)
  return names
}

function stripEstablishedRepoNames(text, names) {
  let out = text
  for (const name of names) out = out.split(name).join("")
  return out
}

function checkText(context, node, text, isComment) {
  for (const { pattern, suggestion } of COMPILED) {
    const match = pattern.exec(text)
    if (match) {
      context.report({
        node,
        messageId: isComment ? "bannedWordComment" : "bannedWordCode",
        data: { word: match[0], suggestion },
      })
    }
  }
}

// skip the literal Web API `Response.blob()` (Fetch) / `HTMLCanvasElement.toBlob()` (Canvas) method
// calls - only flag "blob" as a chosen variable/property name, not the built-in method itself
function isRealBlobMethodCall(node) {
  const parent = node.parent
  return (
    parent?.type === "MemberExpression" &&
    parent.property === node &&
    !parent.computed &&
    parent.parent?.type === "CallExpression" &&
    parent.parent.callee === parent
  )
}

// skip the literal global `eval(...)` call - only flag "eval" as a chosen variable/function name
function isRealEvalCall(node) {
  return node.parent?.type === "CallExpression" && node.parent.callee === node
}

// DOM and third-party property names we do not get to rename: `event.target`, `element.dataset`,
// `formState.isDirty` (react-hook-form), `RequestInit.cache`. Only a non-computed MEMBER property
// read is skipped - a variable or parameter someone named `target` is still our own decision and
// still trips.
const EXTERNAL_PROPERTY_NAMES = new Set(["target", "currentTarget", "cache", "isDirty", "dirtyFields", "eval"])

function isExternalPropertyRead(node) {
  const parent = node.parent
  return parent?.type === "MemberExpression" && parent.property === node && !parent.computed
}

module.exports = {
  "no-banned-words": {
    meta: {
      type: "suggestion",
      docs: {
        description: "disallow jargon/vague words in identifiers, string literals, and comments",
      },
      schema: [],
      messages: {
        bannedWordCode: 'Avoid the word "{{word}}" - {{suggestion}}.',
        bannedWordComment: 'Avoid the word "{{word}}" in comments - {{suggestion}}.',
      },
    },
    create(context) {
      // This file IS the dictionary - every banned word and its replacement message is written out
      // here verbatim for the rule to have anything to match on, so scanning itself reports hits
      // that no rewording can remove without deleting the rule's own data.
      const filename = context.filename ?? context.getFilename()
      if (/[/\\]no-banned-words\.js$/.test(filename)) return {}

      const establishedNames = establishedRepoNames(filename)
      const establishedNameSet = new Set(establishedNames.map(name => name.toLowerCase()))

      let externalImportNames = new Set()

      return {
        Identifier(node) {
          // skip the literal Web API `Blob` global (new Blob(...), `: Blob` type refs)
          if (node.name === "Blob") return
          if ((node.name === "blob" || node.name === "toBlob") && isRealBlobMethodCall(node)) return
          if (node.name === "eval" && isRealEvalCall(node)) return
          if (externalImportNames.has(node.name)) return
          if (EXTERNAL_PROPERTY_NAMES.has(node.name) && isExternalPropertyRead(node)) return
          if (establishedNameSet.has(node.name.toLowerCase())) return

          for (const word of splitIdentifierWords(node.name)) checkText(context, node, word, false)
        },
        Literal(node) {
          if (typeof node.value === "string")
            checkText(context, node, stripEstablishedRepoNames(stripAllowedSenses(node.value), establishedNames), false)
        },
        Program(node) {
          externalImportNames = collectExternalImportNames(node)

          const sourceCode = context.getSourceCode()
          for (const comment of sourceCode.getAllComments()) {
            checkText(context, comment, stripEstablishedRepoNames(stripAllowedSenses(comment.value), establishedNames), true)
          }
        },
      }
    },
  },
}
