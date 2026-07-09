"use strict"

const { findZustandStoreObjectLiterals } = require("./utils/findZustandStoreObjectLiterals")

// Within a zustand store's returned object, each state property should sit directly next to its
// own setter (whatever verb the setter uses - set/add/reset/clear/toggle/upd/increase/decrease/
// remove/push/hadd/hdel/hupd, not just "set"), with a blank line separating each state+setter
// pair from the next one. Unrelated properties (no matching pair) aren't required to have a
// blank line before/after them - only recognized pairs are checked.
// Wrong:
//   isSetSecretKeyInLS: false,
//   skOrOTPInputValue: "",
//   setIsSetSecretKeyInLS: (isSetSecretKeyInLS: boolean) => set(() => ({ isSetSecretKeyInLS })),
//   setSKOrOTPInputValue: SKInputValue => set(() => ({ skOrOTPInputValue: SKInputValue })),
// Correct:
//   isSetSecretKeyInLS: false,
//   setIsSetSecretKeyInLS: (isSetSecretKeyInLS: boolean) => set(() => ({ isSetSecretKeyInLS })),
//
//   skOrOTPInputValue: "",
//   setSKOrOTPInputValue: skOrOTPInputValue => set(() => ({ skOrOTPInputValue })),
const SETTER_VERB_PREFIXES = [
  "set",
  "add",
  "reset",
  "clear",
  "toggle",
  "upd",
  "update",
  "increase",
  "decrease",
  "remove",
  "push",
  "hadd",
  "hdel",
  "hupd",
]

// Strips a recognized verb prefix from a property name and lowercases the following letter, so
// "setIsSetSecretKeyInLS" -> "isSetSecretKeyInLS", matchable against the state property
// "isSetSecretKeyInLS" it pairs with. Returns null if no known verb prefix matches.
function stripSetterVerb(name) {
  for (const verb of SETTER_VERB_PREFIXES) {
    if (name.length > verb.length && name.startsWith(verb) && /[A-Z]/.test(name[verb.length])) {
      return name[verb.length].toLowerCase() + name.slice(verb.length + 1)
    }
  }
  return null
}

module.exports = {
  "zustand-state-setter-pairing": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require a zustand store's state property to sit directly next to its own setter, with a blank line between each pair",
      },
      schema: [],
      messages: {
        pairNotAdjacent:
          '"{{stateName}}" and its setter "{{setterName}}" should be adjacent (state property immediately followed by its own setter), not separated by other properties.',
        missingBlankLineBetweenPairs:
          'Add a blank line after the "{{stateName}}" / "{{setterName}}" pair, before the next property.',
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      return {
        Program(node) {
          const objectLiterals = findZustandStoreObjectLiterals(node)

          for (const objectLiteral of objectLiterals) {
            const properties = objectLiteral.properties.filter(
              property => property.type === "Property" && property.key.type === "Identifier",
            )

            // Map from a state property's name to the setter property that pairs with it (only
            // among properties whose stripped-verb form matches another property's name exactly).
            const nameToProperty = new Map(properties.map(property => [property.key.name, property]))

            // A state name matched by MORE THAN ONE setter-shaped property (e.g. "ingredient"
            // matched by setIngredient, addIngredient, AND removeIngredient) is ambiguous - it's
            // not a single state+setter pair, it's a state with several independent action
            // methods. Skip pairing entirely for those names rather than guessing which one
            // setter is "the" pair.
            const setterMatchCounts = new Map()
            for (const property of properties) {
              const strippedName = stripSetterVerb(property.key.name)
              if (!strippedName || !nameToProperty.has(strippedName)) continue
              setterMatchCounts.set(strippedName, (setterMatchCounts.get(strippedName) ?? 0) + 1)
            }

            const pairs = []
            for (const property of properties) {
              const strippedName = stripSetterVerb(property.key.name)
              if (!strippedName) continue
              const stateProperty = nameToProperty.get(strippedName)
              if (!stateProperty || stateProperty === property) continue
              if ((setterMatchCounts.get(strippedName) ?? 0) > 1) continue
              pairs.push({ stateProperty, setterProperty: property })
            }

            for (const { stateProperty, setterProperty } of pairs) {
              const stateIndex = properties.indexOf(stateProperty)
              const setterIndex = properties.indexOf(setterProperty)

              if (Math.abs(setterIndex - stateIndex) !== 1) {
                context.report({
                  node: setterProperty,
                  messageId: "pairNotAdjacent",
                  data: { stateName: stateProperty.key.name, setterName: setterProperty.key.name },
                })
                continue
              }

              // The pair's later property (whichever of the two comes second in source order) is
              // the one that should have a blank line after it, before the next property.
              const laterIndex = Math.max(stateIndex, setterIndex)
              const laterProperty = properties[laterIndex]
              const nextProperty = properties[laterIndex + 1]
              if (!nextProperty) continue

              // Skip if nextProperty is itself the state-half of a DIFFERENT pair whose setter
              // comes before it - already covered by that pair's own check from its own "later"
              // property, so this avoids double-reporting the same gap from both sides.
              const blankLinesBetween = nextProperty.loc.start.line - laterProperty.loc.end.line
              if (blankLinesBetween < 2) {
                context.report({
                  node: laterProperty,
                  messageId: "missingBlankLineBetweenPairs",
                  data: { stateName: stateProperty.key.name, setterName: setterProperty.key.name },
                })
              }
            }
          }
        },
      }
    },
  },
}
