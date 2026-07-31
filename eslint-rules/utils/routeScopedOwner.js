"use strict"

const fs = require("fs")
const path = require("path")

const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".cache",
  ".git",
  ".home",
  ".next",
  ".open-next",
  ".pnpm-store",
  "node_modules",
  "storybook-static",
])

const repositoryFilesCache = new Map()
const fileContentCache = new Map()

function getLocalizedOwner(segments) {
  if (segments[0] !== "[locale]") return null

  const routeGroup = segments[1]
  if (routeGroup?.startsWith("(") && routeGroup.endsWith(")")) {
    const featureSegment = segments[2]
    if (!featureSegment) return `[locale]/${routeGroup}`

    if (featureSegment === "components" && segments[3]) {
      return `[locale]/${routeGroup}/components/${segments[3]}`
    }

    if (["functions", "hooks", "store"].includes(featureSegment)) return `[locale]/${routeGroup}`
    return `[locale]/${routeGroup}/${featureSegment}`
  }

  return segments[1] ? `[locale]/${segments[1]}` : null
}

function getOwnerKey(segments) {
  const normalizedSegments = segments.filter(Boolean)
  const localizedOwner = getLocalizedOwner(normalizedSegments)
  if (localizedOwner) return localizedOwner

  if (normalizedSegments[0] === "widgets" || normalizedSegments[0] === "modules") {
    return normalizedSegments.slice(0, Math.min(normalizedSegments.length, 3)).join("/")
  }

  return null
}

function addPatternNames(pattern, names) {
  if (!pattern) return
  if (pattern.type === "Identifier") {
    names.add(pattern.name)
    return
  }
  if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      if (property.type === "Property") addPatternNames(property.value, names)
      else if (property.type === "RestElement") addPatternNames(property.argument, names)
    }
  }
  if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements) addPatternNames(element, names)
  }
}

function getExportedNames(sourceCode) {
  const names = new Set()

  for (const node of sourceCode.ast.body) {
    if (node.type !== "ExportNamedDeclaration" && node.type !== "ExportDefaultDeclaration") continue

    const declaration = node.declaration
    if (declaration?.type === "VariableDeclaration") {
      for (const variable of declaration.declarations) addPatternNames(variable.id, names)
    } else if (declaration?.id?.name) {
      names.add(declaration.id.name)
    }

    for (const specifier of node.specifiers ?? []) {
      if (specifier.exported?.name) names.add(specifier.exported.name)
    }
  }

  return [...names]
}

function collectRepositoryFiles(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue

    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      collectRepositoryFiles(entryPath, files)
      continue
    }

    if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(entryPath)
  }
}

function getRepositoryFiles(repoRoot) {
  const cachedFiles = repositoryFilesCache.get(repoRoot)
  if (cachedFiles) return cachedFiles

  const files = []
  for (const directoryName of ["app", "cypress", "storybook", ".storybook"]) {
    const directory = path.join(repoRoot, directoryName)
    if (fs.existsSync(directory)) collectRepositoryFiles(directory, files)
  }

  repositoryFilesCache.set(repoRoot, files)
  return files
}

function findImporterFiles(names, repoRoot, filename) {
  if (names.length === 0) return []
  const patterns = names.map(name => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`))

  return getRepositoryFiles(repoRoot).filter(file => {
    if (path.resolve(file) === path.resolve(filename)) return false

    let content = fileContentCache.get(file)
    if (content === undefined) {
      try {
        content = fs.readFileSync(file, "utf8")
      } catch {
        content = null
      }
      fileContentCache.set(file, content)
    }

    if (content === null) return false
    return patterns.some(pattern => pattern.test(content))
  })
}

module.exports = { getOwnerKey, getExportedNames, findImporterFiles }
