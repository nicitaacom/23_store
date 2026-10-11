import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"

import { buildStorageTar, readStorageTarEntries } from "@/api/backup/storageFilesTar"
import { parseTar } from "@/api/backup/tarClient"

const [sourcePath, requestedDestination] = process.argv.slice(2)
if (!sourcePath || !/\.(tar\.gz|tgz)$/i.test(sourcePath)) {
  throw new Error("Usage: pnpm backup:repair-files <files.tar.gz> [repaired.tar.gz]")
}

const destinationPath = requestedDestination ?? sourcePath.replace(/\.(tar\.gz|tgz)$/i, "-extractable.tar.gz")
if (path.resolve(sourcePath) === path.resolve(destinationPath))
  throw new Error("Choose a different output path to preserve the source backup")

const entries = parseTar(gunzipSync(await readFile(sourcePath)))
const files = readStorageTarEntries(entries)
if (files.length === 0) throw new Error("No Storage files found; choose the Files backup rather than the Tables backup")
const repairedTar = buildStorageTar(files)
const repairedEntries = parseTar(repairedTar)
const renamedFiles = repairedEntries.get("storage-paths.json")
  ? Object.keys(JSON.parse(repairedEntries.get("storage-paths.json").toString("utf8"))).length
  : 0

await writeFile(destinationPath, gzipSync(repairedTar), { flag: "wx" })
console.log(
  `Created ${destinationPath}: ${files.length} files, ${renamedFiles} shortened exported paths; original Storage keys preserved`,
)
