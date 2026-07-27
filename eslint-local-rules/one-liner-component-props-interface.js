"use strict"

const { MAX_LINE_LENGTH, getIndentString, collapseToSingleLine } = require("./utils/lineWidth")

// A component's props type typed INLINE in the function signature (an anonymous `{ ... }` object
// type literal) can't be reused, can't be exported, and pushes the type definition into the same
// line as the destructuring - the signature gets harder to read the more props a component takes.
// This codebase's own established convention (174 of 184 existing Props declarations, see
// type-naming-prefix.js's own "Props types stay ComponentNameProps" note) is a separate named
// type - either `interface ComponentNameProps { ... }` or `type ComponentNameProps = { ... }` -
// declared once, then referenced from the signature.
//
// Bad:
//   function StepSection({ isActive, isLocked = false, children }: {
//     isActive: boolean
//     isLocked?: boolean
//     children: React.ReactNode
//   }) { ... }
// Good:
//   interface StepSectionProps {
//     isActive: boolean
//     isLocked?: boolean
//     children: React.ReactNode
//   }
//   function StepSection({ isActive, isLocked = false, children }: StepSectionProps) { ... }
//
// Exception: when the inline type is small enough that the WHOLE signature (destructured params +
// inline type, on the real declaration's own indent) still fits on one line within this project's
// max-len (130) - e.g. `export function AIEmailsDecisionsStats({ domain }: { domain: string | null }) {`
// - extracting a named interface for a single trivial field is pure ceremony, not a readability win.
// Only the genuinely-too-long-for-one-line case (like the StepSection example above) gets flagged.
//
// Not autofixed - naming the extracted type and deciding where it lives (same file vs a shared
// types.ts) is the same kind of call this codebase's other structural rules (e.g.
// import-encapsulated-module-widget's deepPrivateReach) leave to a human, not a mechanical rewrite.
function isPascalCase(name) {
  return /^[A-Z]/.test(name)
}

function containsJSX(node) {
  let found = false
  function walk(current) {
    if (!current || typeof current.type !== "string" || found) return
    if (current.type === "JSXElement" || current.type === "JSXFragment") {
      found = true
      return
    }
    for (const key in current) {
      if (key === "parent") continue
      const value = current[key]
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value.type === "string") walk(value)
    }
  }
  walk(node)
  return found
}

// Unwraps memo(...)/forwardRef(...) to the function they actually wrap - "const Row =
// memo(function Row(...) {...})" is still Row being a component, not memo/forwardRef - same
// helper as no-component-in-hooks-folder.js.
function unwrapKnownComponentWrapper(node) {
  let current = node
  while (
    current &&
    current.type === "CallExpression" &&
    current.callee.type === "Identifier" &&
    (current.callee.name === "memo" || current.callee.name === "forwardRef")
  ) {
    current = current.arguments[0]
  }
  return current
}

// The props parameter is always first (forwardRef's second "ref" parameter is untyped/typed
// separately, never itself the props) - an inline object type literal there is the violation; a
// named type reference (ComponentNameProps, or a generic like Readonly<X>) is exactly the fix.
function findInlinePropsTypeLiteral(functionNode) {
  const propsParam = functionNode.params[0]
  if (!propsParam || propsParam.type !== "ObjectPattern") return null
  const typeAnnotation = propsParam.typeAnnotation?.typeAnnotation
  if (!typeAnnotation || typeAnnotation.type !== "TSTypeLiteral") return null
  return typeAnnotation
}

// The real declaration statement (walks up past ExportNamedDeclaration/ExportDefaultDeclaration,
// and past a `const X = memo(...)`/`forwardRef(...)` wrapper) - its own start is where the real
// rendered line begins ("export function Foo(" or "export const Foo = memo(function Foo("), not
// the bare FunctionDeclaration/FunctionExpression node's own range (which excludes "export ").
function findTopLevelStatement(node) {
  let current = node
  while (current.parent && current.parent.type !== "Program") current = current.parent
  return current
}

// Would the WHOLE signature - real declaration prefix + destructured params + inline type, on the
// declaration's own indent - still fit on one line within this project's max-len? If so, extracting
// a named interface is pure ceremony (see the rule's own top comment for the concrete example).
function wouldFitOnOneLine(context, functionNode, propsParam, inlineType) {
  const sourceCode = context.sourceCode ?? context.getSourceCode()
  const sourceText = sourceCode.getText()
  const typeAnnotation = propsParam.typeAnnotation
  const topStatement = findTopLevelStatement(functionNode)

  const prefixText = sourceText.slice(topStatement.range[0], propsParam.range[0]).replace(/\s+/g, " ")
  const patternText = sourceText.slice(propsParam.range[0], typeAnnotation.range[0])
  const typeOneLine = collapseToSingleLine(sourceCode, inlineType)
  const suffixText = sourceText.slice(inlineType.range[1], functionNode.body.range[0]).replace(/\s+/g, " ")
  const indent = getIndentString(sourceCode, topStatement)

  const candidate = `${indent}${prefixText}${patternText}: ${typeOneLine}${suffixText}{`
  return candidate.length <= MAX_LINE_LENGTH
}

module.exports = {
  "one-liner-component-props-interface": {
    meta: {
      type: "suggestion",
      docs: {
        description:
          "require a component's props to be typed as a named interface/type (ComponentNameProps), not an inline object type literal in the signature",
      },
      schema: [],
      messages: {
        inlinePropsType:
          '"{{name}}"\'s props are typed inline in the signature instead of a named type - inline props can\'t be reused/exported and make the signature harder to read. Extract to "interface {{name}}Props { ... }" (or "type {{name}}Props = { ... }") above the component, then type the parameter as "{ ... }: {{name}}Props".',
      },
    },
    create(context) {
      const reported = new Set()

      function check(name, functionNode) {
        if (!name || !isPascalCase(name)) return
        if (reported.has(name)) return
        const inlineType = findInlinePropsTypeLiteral(functionNode)
        if (!inlineType) return
        if (!containsJSX(functionNode.body)) return
        if (wouldFitOnOneLine(context, functionNode, functionNode.params[0], inlineType)) return
        reported.add(name)
        context.report({ node: inlineType, messageId: "inlinePropsType", data: { name } })
      }

      return {
        FunctionDeclaration(node) {
          if (node.id) check(node.id.name, node)
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier") return
          const target = unwrapKnownComponentWrapper(node.init)
          if (!target) return
          if (target.type === "FunctionExpression" || target.type === "ArrowFunctionExpression") {
            check(node.id.name, target)
          }
        },
      }
    },
  },
}
