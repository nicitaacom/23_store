"use strict"

// inputValue/setInputValue naming for controlled inputs (e.g. phoneNumberValue/setPhoneNumberValue).
// Flags a useState destructure `[x, setX]` where `x` is passed as the `value` prop of a JSX
// <input>/<textarea> but its name doesn't end in "Value", or the setter name doesn't match
// `set` + the value name.
function isSetterNameFor(valueName, setterName) {
  const expected = "set" + valueName[0].toUpperCase() + valueName.slice(1)
  return setterName === expected
}

module.exports = {
  "input-value-naming": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require useState pairs backing a controlled input to be named xxxValue/setXxxValue",
      },
      schema: [],
      messages: {
        missingValueSuffix:
          'Controlled input state "{{name}}" should be named "{{suggested}}" (end in "Value", e.g. phoneNumberValue).',
        setterMismatch: 'Setter "{{setterName}}" should be named "{{expected}}" to match the value name "{{name}}".',
      },
    },
    create(context) {
      const stateVariablePairs = []

      return {
        VariableDeclarator(node) {
          if (
            node.id.type !== "ArrayPattern" ||
            node.id.elements.length !== 2 ||
            !node.init ||
            node.init.type !== "CallExpression" ||
            node.init.callee.type !== "Identifier" ||
            node.init.callee.name !== "useState"
          ) {
            return
          }

          const [valueNode, setterNode] = node.id.elements
          if (!valueNode || valueNode.type !== "Identifier" || !setterNode || setterNode.type !== "Identifier") return
          stateVariablePairs.push({ valueNode, setterNode })
        },
        "JSXAttribute[name.name='value']"(node) {
          if (!node.value || node.value.type !== "JSXExpressionContainer") return
          const expression = node.value.expression
          if (expression.type !== "Identifier") return

          const jsxElement = node.parent
          const tagName = jsxElement.name && jsxElement.name.name
          if (tagName !== "input" && tagName !== "textarea") return

          const pair = stateVariablePairs.find(item => item.valueNode.name === expression.name)
          if (!pair) return

          const name = pair.valueNode.name
          // must end in the exact suffix "Value" (capital V) - a bare "value"/"val" is itself a
          // violation (no domain word), not an already-correct name
          const hasCorrectValueSuffix = /[a-z]Value$/.test(name)
          if (!hasCorrectValueSuffix) {
            // bare "value"/"val" has no domain word to prefix - suggest a placeholder pattern
            // instead of a nonsensical doubled name like "valueValue"
            const isBareValue = /^val$/i.test(name) || /^value$/i.test(name)
            const suggested = isBareValue ? "<domainName>Value (e.g. phoneNumberValue)" : name + "Value"
            context.report({ node: pair.valueNode, messageId: "missingValueSuffix", data: { name, suggested } })
            return
          }

          if (!isSetterNameFor(name, pair.setterNode.name)) {
            const expected = "set" + name[0].toUpperCase() + name.slice(1)
            context.report({
              node: pair.setterNode,
              messageId: "setterMismatch",
              data: { setterName: pair.setterNode.name, expected, name },
            })
          }
        },
      }
    },
  },
}
