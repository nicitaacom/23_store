"use strict"

// Rule 5 (type naming): an EXPORTED type/interface must be prefixed T (type) or I (interface) -
// e.g. TEmailDB, TEmailDBWithLabelsAndFolders, IDeliveryInstructionsFormData. A non-exported
// (local/private) type/interface does not need the prefix. Props types are exempt either way -
// they stay ComponentNameProps, never TComponentNameProps/IComponentNameProps, matching this
// codebase's existing convention.
function isPropsType(name) {
  return /Props$/.test(name)
}

function hasCorrectPrefix(name, expectedPrefix) {
  return new RegExp(`^${expectedPrefix}[A-Z]`).test(name)
}

// If the name already starts with the OTHER single-letter prefix (T on an interface, I on a
// type), suggest swapping it rather than prepending the correct prefix on top - prepending would
// produce a nonsensical double-prefixed name like "TISmth" instead of "TSmth".
function suggestedName(name, expectedPrefix, otherPrefix) {
  const startsWithOtherPrefix = new RegExp(`^${otherPrefix}[A-Z]`).test(name)
  if (startsWithOtherPrefix) return expectedPrefix + name.slice(1)
  return expectedPrefix + name
}

module.exports = {
  "type-naming-prefix": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require exported type/interface names to be prefixed T/I (except Props types)",
      },
      schema: [],
      messages: {
        missingPrefix: 'Exported {{kind}} "{{name}}" should be prefixed "{{expectedPrefix}}" (e.g. {{suggested}}).',
      },
    },
    create(context) {
      function check(node, declarationNode, kind, expectedPrefix, otherPrefix) {
        const name = declarationNode.id.name
        if (isPropsType(name)) return
        if (hasCorrectPrefix(name, expectedPrefix)) return

        const suggested = suggestedName(name, expectedPrefix, otherPrefix)
        context.report({ node: declarationNode.id, messageId: "missingPrefix", data: { kind, name, expectedPrefix, suggested } })
      }

      return {
        "ExportNamedDeclaration > TSTypeAliasDeclaration"(node) {
          check(node, node, "type", "T", "I")
        },
        "ExportNamedDeclaration > TSInterfaceDeclaration"(node) {
          check(node, node, "interface", "I", "T")
        },
        ExportDefaultDeclaration(node) {
          if (node.declaration.type === "TSTypeAliasDeclaration") check(node, node.declaration, "type", "T", "I")
          else if (node.declaration.type === "TSInterfaceDeclaration") check(node, node.declaration, "interface", "I", "T")
        },
      }
    },
  },
}
