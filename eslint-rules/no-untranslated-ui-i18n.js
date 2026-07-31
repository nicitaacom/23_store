/**
 * Flags user-facing literals in JSX. Translated strings should come from the
 * locale hooks (t(...)), while technical values such as class names and URLs
 * are intentionally ignored.
 */
module.exports = {
  "no-untranslated-ui": {
    meta: {
      type: "problem",
      docs: {
        description: "Disallow user-facing JSX literals that bypass i18n",
      },
      schema: [
        {
          type: "object",
          properties: {
            ignore: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      ],
      messages: {
        untranslated: "User-facing text must come from the locale system.",
      },
    },

    create(context) {
      const configuredIgnore = new Set(context.options[0]?.ignore ?? [])
      const userFacingAttributes = new Set(["alt", "aria-label", "placeholder", "title"])

      const isUserFacing = value => {
        const text = value.trim()
        if (!text || configuredIgnore.has(text)) return false
        if (!/[A-Za-zА-Яа-яЁёІіЇїЄєÄÖÜäöüß]/.test(text)) return false
        if (/^(https?:\/\/|\/|#[\w-]+$)/.test(text)) return false
        return true
      }

      return {
        JSXText(node) {
          if (isUserFacing(node.value)) context.report({ node, messageId: "untranslated" })
        },

        JSXAttribute(node) {
          if (!node.value || node.value.type !== "Literal" || !userFacingAttributes.has(node.name.name)) return
          if (typeof node.value.value === "string" && isUserFacing(node.value.value)) {
            context.report({ node: node.value, messageId: "untranslated" })
          }
        },
      }
    },
  },
}
