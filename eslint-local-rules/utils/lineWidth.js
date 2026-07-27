"use strict"

const MAX_LINE_LENGTH = 130

function getIndentString(sourceCode, node) {
  const sourceLine = sourceCode.lines[node.loc.start.line - 1]
  return sourceLine.match(/^\s*/)?.[0] ?? ""
}

// Collapse source whitespace while preserving whitespace inside string and template literals.
function collapseToSingleLine(sourceCode, node) {
  const tokensAndComments = sourceCode.getTokens(node, { includeComments: true })
  const sourceText = sourceCode.getText(node)
  const nodeStart = node.range[0]
  const verbatimRanges = tokensAndComments
    .filter(token => token.type === "String" || token.type === "Template")
    .map(token => [token.range[0] - nodeStart, token.range[1] - nodeStart])

  function isInsideVerbatimRange(index) {
    return verbatimRanges.some(([start, end]) => index >= start && index < end)
  }

  let collapsedText = ""
  let previousWasCollapsedSpace = false

  for (let index = 0; index < sourceText.length; index++) {
    const character = sourceText[index]

    if (isInsideVerbatimRange(index)) {
      collapsedText += character
      previousWasCollapsedSpace = false
      continue
    }

    if (/\s/.test(character)) {
      if (!previousWasCollapsedSpace) {
        collapsedText += " "
        previousWasCollapsedSpace = true
      }
      continue
    }

    collapsedText += character
    previousWasCollapsedSpace = false
  }

  return collapsedText.trim()
}

module.exports = { MAX_LINE_LENGTH, getIndentString, collapseToSingleLine }
