// The personalization SQL is run by hand, so a database that predates it answers every write with a
// raw Postgres message that says nothing about what to do. These two helpers turn that into one
// sentence naming the SQL block to run.

type TDatabaseErrorShape = { code?: string | null; message?: string | null }

// Postgres answers 42703 for a column that is not there and 42P01 for a table; PostgREST reports the
// same two as PGRST204 / PGRST205 when the column or table is absent from the schema it knows about.
const MISSING_SCHEMA_CODES = new Set(["42703", "42P01", "PGRST204", "PGRST205"])

export function isMissingSchemaError(error: TDatabaseErrorShape | null | undefined) {
  if (!error) return false
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true
  return /does not exist|could not find the/i.test(error.message ?? "")
}

export function getRunPersonalizationSqlMessage(missingPiece: string) {
  return `${missingPiece} is missing in the database. Run the 🖼️ PRODUCT PERSONALIZATION block in dev_readme-supbase-sql.md, then try again.`
}
