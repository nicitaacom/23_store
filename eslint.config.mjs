import nextConfig from "eslint-config-next"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import unicorn from "eslint-plugin-unicorn"
import localRules from "./eslint-local-rules/index.js"

export default [
  {
    ignores: [".cache/**", ".home/**", ".open-next/**", ".pnpm-store/**", "storybook-static/**"],
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
      "local-rules/style-before-classname": "warn",
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
      "local-rules/no-type-export-in-action-or-component": "warn",
      "local-rules/imports-order": "warn",
      "local-rules/no-high-level-import": "warn",
      "local-rules/no-cross-route-group-absolute-import": "warn",
      "local-rules/require-absolute-import-for-shared-folders": "warn",
      "local-rules/use-rls-supabase-client": "warn",
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
    // Ignore eslint-local-rules directory and config files - these are tool files, not source code
    ignores: ["eslint-local-rules/**", "eslint.config.mjs"],
  },
]
