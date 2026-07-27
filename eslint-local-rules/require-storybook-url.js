"use strict"

// PascalCase only - an all-caps name is a route handler (`export async function POST`), not a component.
const componentNamePattern = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/
const storybookUrlPattern = /^(?:https:\/\/[^\s/]+\.chromatic\.com|http:\/\/localhost:6006)\/\?path=\/story\/\S+$/

function isComponentName(name) {
  return typeof name === "string" && componentNamePattern.test(name)
}

function isFunctionalComponentInitializer(node) {
  if (!node) return false
  if (["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) return !node.async
  return node.type === "CallExpression" && node.callee.type === "Identifier" && ["forwardRef", "memo", "lazy", "dynamic"].includes(node.callee.name)
}

function hasChromaticStoryUrlComment(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  const previousComment = comments.at(-1)
  return previousComment ? storybookUrlPattern.test(previousComment.value.trim()) : false
}

module.exports = {
  "require-storybook-url": {
    meta: {
      type: "problem",
      docs: {
        description: "require exported React components to link to their Storybook story",
      },
      schema: [],
      messages: {
        missingStorybookUrl: "Add the Storybook URL as the comment immediately above this component.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode

      function checkComponent(node, name) {
        if (!isComponentName(name) || hasChromaticStoryUrlComment(sourceCode, node)) return
        context.report({ node, messageId: "missingStorybookUrl" })
      }

      return {
        ExportNamedDeclaration(node) {
          const declaration = node.declaration
          if (!declaration) return

          if (declaration.type === "FunctionDeclaration") {
            // An async component is a server component - it awaits its own data and never renders in Storybook.
            if (!declaration.async) checkComponent(node, declaration.id?.name)
            return
          }

          if (declaration.type !== "VariableDeclaration") return
          for (const declarator of declaration.declarations) {
            if (!isFunctionalComponentInitializer(declarator.init)) continue
            checkComponent(node, declarator.id.type === "Identifier" ? declarator.id.name : undefined)
          }
        },
        ExportDefaultDeclaration(node) {
          if (node.declaration.type !== "FunctionDeclaration" || node.declaration.async) return
          checkComponent(node, node.declaration.id?.name || "DefaultComponent")
        },
      }
    },
  },
}
