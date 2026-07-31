"use strict"

// Rule 17: NEVER use process.env.TWILIO_SID! - use process.env.TWILIO_SID instead. No need for a
// non-null assertion on an env var in general - it's a bad practice (silently lies about a value
// that really can be undefined at runtime, e.g. a missing .env entry in a new environment).
module.exports = {
  "no-process-env-non-null-assertion": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow non-null assertion on process.env.X",
      },
      schema: [],
      messages: {
        noNonNullAssertion: 'Do not use "process.env.{{name}}!" - use "process.env.{{name}}" instead, a non-null assertion on an env var hides a real missing-value case.',
      },
    },
    create(context) {
      return {
        "TSNonNullExpression > MemberExpression[object.object.name='process'][object.property.name='env']"(node) {
          const nonNullExpression = node.parent
          context.report({
            node: nonNullExpression,
            messageId: "noNonNullAssertion",
            data: { name: node.property.name },
          })
        },
      }
    },
  },
}
