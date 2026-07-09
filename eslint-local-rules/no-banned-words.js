"use strict"

// Rule 14: no jargon/clever/vivid words in code or comments/docs - use the plainest accurate word.
// This list is NOT exhaustive by the user's own wording ("if a word could confuse a reader, it's
// banned even if not listed") - it only encodes the words explicitly named, minus the handful that
// are only bad in one specific meaning and would false-positive too often to regex-match safely
// (documented as skipped, in no-banned-words below, not silently dropped).
const BANNED_WORDS = [
  { pattern: /\bblob\b/i, suggestion: "name the real noun for what the thing is (e.g. file, buffer, image)" },
  { pattern: /\bplain\b/i, suggestion: "name the real noun/verb for what the thing is" },
  { pattern: /\borphan(ed)?\b/i, suggestion: "spell out what is actually unreferenced/unlinked" },
  { pattern: /\bdead\b/i, suggestion: "spell out what is actually unused/unreachable" },
  { pattern: /\bpopup\b/i, suggestion: "name what it actually is (notification/toast/card)" },
  { pattern: /\bserver attaches\b/i, suggestion: "name the real mechanism" },
  { pattern: /\binstructions\b/i, suggestion: 'for user-facing AI input, use "prompt" instead' },
  {
    pattern: /\b(is)?saving\b/i,
    suggestion: "say which backend: updating/inserting (Supabase), setting (Redis)",
  },
  { pattern: /\barmed?\b/i, suggestion: "use enable/enabled" },
  { pattern: /\bSDK call\b/i, suggestion: 'use "SDK method" or "SDK sends an API request"' },
  { pattern: /\bcarry(ing)?\b/i, suggestion: "use sending or name the real mechanism" },
  { pattern: /\bmutates?\b/i, suggestion: "use update/upd per the verb table, not the generic CS term" },
  {
    pattern: /\bhas loaded real data\b|\breal \(fetched\) state\b/i,
    suggestion: "name the actual hook and verb instead",
  },
  { pattern: /\b(can'?t|cannot|never can)\b/i, suggestion: "state the positive guarantee or actual mechanism instead" },
  { pattern: /\bloads?\b/i, suggestion: "name the actual verb (fetch/select/get/insert/read/etc.) instead of the standalone verb load" },
  {
    pattern: /\bnarrow(ed|ing)?\b/i,
    suggestion: 'spell out what happens instead of the vague verb "narrow" (fine only as TypeScript\'s own term for type narrowing)',
  },
  {
    pattern: /\bclosures?\b/i,
    suggestion: "say what's actually stale/captured instead of naming the JS concept and stopping there",
  },
]

function checkText(context, node, text, isComment) {
  for (const { pattern, suggestion } of BANNED_WORDS) {
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
      return {
        Identifier(node) {
          // skip the literal Web API `Blob` global (new Blob(...), `: Blob` type refs) - only flag
          // it as a chosen variable/param name, not a reference to the built-in class itself
          if (node.name === "Blob") return
          checkText(context, node, node.name, false)
        },
        Literal(node) {
          if (typeof node.value === "string") checkText(context, node, node.value, false)
        },
        Program() {
          const sourceCode = context.getSourceCode()
          for (const comment of sourceCode.getAllComments()) {
            checkText(context, comment, comment.value, true)
          }
        },
      }
    },
  },
}
