import nextConfig from "eslint-config-next"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import unicorn from "eslint-plugin-unicorn"
import localRules from "./eslint-rules/index.js"

export default [
  {
    ignores: [".cache/**", ".home/**", ".open-next/**", ".pnpm-store/**", "public/mockServiceWorker.js", "storybook-static/**"],
  },
  ...nextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      unicorn,
      "local-rules": { rules: localRules },
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,

      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off", // ts-ignore-dynamic-table-only that's why it's off
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "off",

      "unicorn/catch-error-name": ["warn", { name: "error" }],

      "local-rules/no-export-const-classname": "warn",
      "local-rules/no-localstorage-direct": "warn",
      "local-rules/no-banned-words": "error",
      "local-rules/no-function-in-deps": "warn",
      "local-rules/no-vague-names": "warn",
      "local-rules/attributes-order": "warn",
      "local-rules/sdk-method-naming": "warn",
      "local-rules/no-throwaway-alias": "warn",
      "local-rules/no-zustand-types-in-store-file": "warn",
      "local-rules/input-value-naming": "warn",
      "local-rules/hook-naming-convention": "warn",
      "local-rules/handle-prefix-location": "warn",
      "local-rules/response-variable-naming": "warn",
      "local-rules/db-redis-verb-naming": "warn",
      "local-rules/no-process-env-non-null-assertion": "warn",
      "local-rules/arrow-fn-only-for-hooks": "warn",
      "local-rules/ts-ignore-dynamic-table-only": "warn",
      "local-rules/type-naming-prefix": "warn",
      "local-rules/one-liner-component-props-interface": "warn",
      "local-rules/no-type-export-in-action-or-component": "warn",
      "local-rules/imports-order": "warn",
      "local-rules/envs-order": "warn",
      "local-rules/no-unused-envs": "warn",
      "local-rules/no-high-level-import": "warn",
      "local-rules/check-importers": "warn",
      "local-rules/no-cross-route-group-absolute-import": "warn",
      "local-rules/require-absolute-import-for-shared-folders": "warn",
      "local-rules/use-rls-supabase-client": "warn",
      "local-rules/console-log-line-number": "warn",
      "local-rules/no-untranslated-ui": "warn",
      "local-rules/no-vague-error-msg": "warn",
    },
  },
  {
    // Components live in .tsx only - in .ts the rule would ask route handlers and helpers for a story.
    // Next.js route files (page/layout/loading/error/global-error/not-found/template) are routes, not
    // components: they run on the server, read params/cookies and fetch their own data, so Storybook
    // shows the components they render instead. Providers and the Storybook decorator itself wrap other
    // components and render nothing on their own.
    files: ["**/*.tsx"],
    ignores: [
      "**/*.stories.tsx",
      "storybook/**",
      ".storybook/**",
      "cypress/**",
      "app/**/page.tsx",
      "app/**/layout.tsx",
      "app/**/loading.tsx",
      "app/**/error.tsx",
      "app/**/not-found.tsx",
      "app/**/template.tsx",
      "app/global-error.tsx",
      "app/providers/**",
    ],
    rules: {
      "local-rules/require-storybook-url": "warn",
    },
  },
  {
    files: ["**/store/**", "**/zustand/**", "**/*.store.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^(set|get)$" }],
    },
  },
  {
    // Supabase-generated types (`supabase gen types`) - not hand-written, so the T/I naming
    // convention doesn't apply and would be overwritten on the next regen anyway.
    files: ["**/interfaces/types_db.ts", "**/ts/types_db.ts"],
    rules: {
      "local-rules/type-naming-prefix": "off",
    },
  },
  {
    // Ignore eslint-rules directory and config files - these are tool files, not source code
    ignores: ["eslint-rules/**", "eslint.config.mjs"],
  },
  {
    // Surfaces decided to stay English on purpose (see plans/plan-08-i18n-sweep.md §0/audit):
    // admin-only tools (only Nikita opens them), the support dashboard (support role only),
    // auth-callback error screens (technical, aimed at support, not buyers), global-error
    // (renders outside the locale layout - no i18n provider), and the internal support email.
    // Plus the one NODE_ENV-gated debug panel.
    files: [
      "app/\\[locale\\]/(support)/**",
      "app/\\[locale\\]/error/**",
      "app/global-error.tsx",
      "app/emails/RequestBetterPricesEmail.tsx",
      // Support-facing notification (same reasoning as RequestBetterPricesEmail below) - see the
      // file's own header comment.
      "app/emails/ErrorReportEmail.tsx",
      // Owner/admin notification, not buyer-facing - see the file's own header comment.
      "app/emails/RequestReplanishmentEmail.tsx",
      "app/components/ui/Modals/AdminPanel/components/CategoriesForm.tsx",
      "app/components/ui/Modals/AdminPanel/components/FormatImagesForm.tsx",
      "app/components/ui/Modals/DbBackup/DbBackupModal.tsx",
      "app/\\[locale\\]/(site)/stats/components/UTMDashboard.tsx",
      "app/\\[locale\\]/(site)/components/MemoryDebug.tsx",
    ],
    rules: {
      "local-rules/no-untranslated-ui": "off",
    },
  },
  {
    // Storybook is dev tooling, never shipped - no buyer ever sees untranslated text in a story.
    files: ["storybook/**", "**/*.stories.tsx"],
    rules: {
      "local-rules/no-untranslated-ui": "off",
    },
  },
]
