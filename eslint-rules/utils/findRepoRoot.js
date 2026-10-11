"use strict"

const fs = require("fs")
const path = require("path")

// Walks up from a linted file to the folder that holds the repo, or null when neither marker shows
// up before the filesystem root. 6 rules held their own copy of this until 2026-08-19, and one of
// them (no-banned-words) looked for ".git" where the other 5 looked for "package.json" - that one
// difference is what silently broke it inside this repo's Docker build, where .dockerignore drops
// .git and the ascent then ran all the way to "/".
//
// Both markers count, so either environment finds the root: a normal clone has both at the same
// folder, the build image has only package.json (the Dockerfile copies it to /app).
const ROOT_MARKERS = ["package.json", ".git"]

function findRepoRoot(filename) {
  let dir = path.dirname(path.resolve(filename))
  while (dir) {
    for (const marker of ROOT_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

module.exports = { findRepoRoot }
