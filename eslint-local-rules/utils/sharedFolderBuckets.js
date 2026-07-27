"use strict"

const path = require("path")

function findAppRoot(filename) {
  let currentPath = path.resolve(filename)
  if (path.extname(currentPath)) currentPath = path.dirname(currentPath)

  while (currentPath !== path.dirname(currentPath)) {
    if (path.basename(currentPath) === "app") return currentPath
    currentPath = path.dirname(currentPath)
  }

  return null
}

module.exports = { findAppRoot }
