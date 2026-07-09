"use strict"

// Rule 6: put `style` first, then `className` in HTML tag arguments.
module.exports = {
  "style-before-classname": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require the style prop to come before className in JSX",
      },
      schema: [],
      messages: {
        styleBeforeClassName: "Put `style` before `className` in JSX attributes.",
      },
    },
    create(context) {
      return {
        JSXOpeningElement(node) {
          const styleIndex = node.attributes.findIndex(
            attribute => attribute.type === "JSXAttribute" && attribute.name.name === "style",
          )
          const classNameIndex = node.attributes.findIndex(
            attribute => attribute.type === "JSXAttribute" && attribute.name.name === "className",
          )

          if (styleIndex === -1 || classNameIndex === -1) return
          if (styleIndex > classNameIndex) {
            context.report({ node: node.attributes[styleIndex], messageId: "styleBeforeClassName" })
          }
        },
      }
    },
  },
}
