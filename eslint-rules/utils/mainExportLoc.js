"use strict"

function getDeclarationName(declaration) {
  if (!declaration) return null
  if ("id" in declaration && declaration.id?.name) return declaration.id.name
  if (declaration.type === "VariableDeclaration") {
    const identifier = declaration.declarations[0]?.id
    return identifier?.type === "Identifier" ? identifier.name : null
  }
  return null
}

function getMainExportLineLoc(programNode, sourceCode, basenameNoExt) {
  const exportedNode = programNode.body.find(node => {
    if (node.type !== "ExportNamedDeclaration" && node.type !== "ExportDefaultDeclaration") return false
    return getDeclarationName(node.declaration) === basenameNoExt
  })

  const fallbackNode = programNode.body.find(
    node => node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration",
  )

  return (exportedNode ?? fallbackNode ?? programNode).loc
}

module.exports = { getMainExportLineLoc }
