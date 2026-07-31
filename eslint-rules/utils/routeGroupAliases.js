"use strict"

const fs = require("fs")
const path = require("path")

function getRouteGroupAliases(appRoot) {
  const tsconfigPath = path.join(path.dirname(appRoot), "tsconfig.json")
  let tsconfig

  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"))
  } catch {
    return {}
  }

  const aliases = {}
  const paths = tsconfig.compilerOptions?.paths ?? {}

  for (const [aliasPattern, targetPatterns] of Object.entries(paths)) {
    if (!aliasPattern.startsWith("@") || aliasPattern === "@/*" || !Array.isArray(targetPatterns)) continue

    const targetPattern = targetPatterns[0]
    if (typeof targetPattern !== "string") continue

    const normalizedTarget = targetPattern.replace(/^\.\//, "").replace(/\/\*$/, "")
    const appPrefix = normalizedTarget.startsWith("app/") ? normalizedTarget.slice(4) : normalizedTarget
    if (!appPrefix.includes("(")) continue

    aliases[appPrefix] = aliasPattern.replace(/\/\*$/, "")
  }

  return aliases
}

module.exports = { getRouteGroupAliases }
