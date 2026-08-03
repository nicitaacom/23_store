/**
 * Teaches node the `@/` alias that `tsconfig.json` gives TypeScript.
 *
 * `node --test` strips types by itself, but it resolves module specifiers the node way, and node has
 * no idea that `@/utils/checkKeys` means `app/utils/checkKeys.ts`. Next.js and tsc read that mapping
 * from `tsconfig.json`; node reads this file instead, passed with `--import`.
 *
 * The extension is added here too, because a TypeScript source writes `@/utils/checkKeys` while node
 * asks the filesystem for an exact filename.
 */
import { existsSync } from "node:fs"
import { registerHooks } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const appDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app")
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"]

function resolveAliasPath(specifier) {
  const withoutAlias = path.join(appDirectory, specifier.slice(2))
  if (existsSync(withoutAlias) && path.extname(withoutAlias)) return withoutAlias

  return EXTENSIONS.map(extension => `${withoutAlias}${extension}`).find(candidate => existsSync(candidate)) ?? null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context)

    const aliasPath = resolveAliasPath(specifier)
    if (!aliasPath) return nextResolve(specifier, context)

    return nextResolve(pathToFileURL(aliasPath).href, context)
  },
})
