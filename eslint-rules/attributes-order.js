"use strict"

// Rule 6: JSX attribute order - `style` first, then `className`, then everything else (including
// spreads), `autoFocus` last. Supersedes the old style-before-classname (which only checked the
// style/className half) - this is the full ordering documented (but previously unenforced past
// style/className) in dev_readme-eslint.md.
//
// Bad:
//   <input autoFocus className="flex" style={{ height: 32 }} onChange={handleChange} />
// Good:
//   <input style={{ height: 32 }} className="flex" onChange={handleChange} autoFocus />
function getRank(attribute) {
  if (attribute.type === "JSXAttribute") {
    if (attribute.name.name === "style") return 0
    if (attribute.name.name === "className") return 1
    if (attribute.name.name === "autoFocus") return 3
  }
  return 2
}

// Stable sort by rank - attributes with the same rank keep their original relative order.
function sortedByRank(attributes) {
  return attributes.map((attribute, index) => ({ attribute, index, rank: getRank(attribute) })).sort((a, b) => a.rank - b.rank || a.index - b.index).map(entry => entry.attribute)
}

module.exports = {
  "attributes-order": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description: "require JSX attribute order: style, className, everything else, autoFocus last",
      },
      schema: [],
      messages: {
        wrongAttributeOrder: "JSX attributes must be ordered: `style`, `className`, everything else, `autoFocus` last.",
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          const attributes = node.attributes
          const sorted = sortedByRank(attributes)

          const isAlreadySorted = attributes.every((attribute, index) => attribute === sorted[index])
          if (isAlreadySorted) return

          context.report({
            node: attributes[0],
            messageId: "wrongAttributeOrder",
            fix(fixer) {
              const sourceCode = context.sourceCode ?? context.getSourceCode()
              return attributes.map((attribute, index) => fixer.replaceText(attribute, sourceCode.getText(sorted[index])))
            },
          })
        },
      }
    },
  },
}
