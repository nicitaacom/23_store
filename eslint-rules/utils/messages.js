"use strict"

// Shared emoji prefix for every rule message that asks a "did you mean X?" question, so the
// emoji can be updated once here instead of per-rule. Leading newline puts the emoji on its own
// line, separate from the sentence before it - every call site already reads
// `... - ${DID_YOU_MEAN_EMOJI}did you mean...`, so the line break has to live here to land
// everywhere without editing each message individually.
const DID_YOU_MEAN_EMOJI = "\n🔧❓"

// A "move it from here to there" suggestion where both paths share a long ancestor - printing both
// in full makes the reader diff two ~100-char strings by eye just to spot the one segment that
// actually differs, and the shared half is the same half they already know. Collapses the shared
// leading segments to "..." and puts each path on its own line, so what's left IS the change:
//
//   .../AccountSettingsTab/components/EditEmailGapSec/EditEmailGapSec.tsx
//   -> .../AccountSettingsTab/EditEmailGapSec/EditEmailGapSec.tsx
//
// The LAST shared segment stays visible on both lines ("AccountSettingsTab" above) - cutting at the
// exact divergence point leaves ".../components/EditEmailGapSec/..." with nothing saying which
// folder that "components" belongs to, so the destination reads as a move to nowhere in particular.
// One level of shared context is what makes it land.
//
// Both paths keep their own last segment even when everything else matches, so a pair that only
// differs in its final filename still reads as two real paths rather than "..." twice.
function formatMovePaths(fromPath, toPath) {
  const fromSegments = fromPath.split("/")
  const toSegments = toPath.split("/")

  let sharedCount = 0
  while (
    sharedCount < fromSegments.length - 1 &&
    sharedCount < toSegments.length - 1 &&
    fromSegments[sharedCount] === toSegments[sharedCount]
  ) {
    sharedCount++
  }

  const cutIndex = Math.max(0, sharedCount - 1)
  const shorten = segments => (cutIndex === 0 ? segments.join("/") : ["...", ...segments.slice(cutIndex)].join("/"))
  return `\n  "${shorten(fromSegments)}"\n-> "${shorten(toSegments)}"`
}

module.exports = { DID_YOU_MEAN_EMOJI, formatMovePaths }
