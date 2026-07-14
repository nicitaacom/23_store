import { writeFileSync } from "node:fs"

const requiredNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_PUSHER_APP_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_STRIPE_SECRET_KEY",
]
const optionalNames = ["PUSHER_APP_ID", "PUSHER_SECRET"]
const missingNames = requiredNames.filter(name => !process.env[name]?.trim())

if (missingNames.length > 0) {
  throw new Error(`Missing GitHub Actions variables or secrets: ${missingNames.join(", ")}`)
}

const environmentNames = [...requiredNames, ...optionalNames].filter(name => process.env[name]?.trim())
const dotenvContents = environmentNames.map(name => `${name}=${JSON.stringify(process.env[name])}`).join("\n")

writeFileSync(".env.local", `${dotenvContents}\n`, { encoding: "utf8", mode: 0o600 })
console.log(`Created .env.local with ${environmentNames.length} CI values`)
