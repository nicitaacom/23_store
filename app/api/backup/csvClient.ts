// Pure CSV read/write (RFC 4180), no Node deps — safe to import from client or server.

function needsQuoting(value: string): boolean {
  return value.includes(",") || value.includes("\"") || value.includes("\n") || value.includes("\r")
}

function quoteField(value: string): string {
  if (value === "") return '""'
  return needsQuoting(value) ? `"${value.replace(/"/g, "\"\"")}"` : value
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach(key => set.add(key))
      return set
    }, new Set<string>()),
  )

  const lines = [columns.map(quoteField).join(",")]

  for (const row of rows) {
    const line = columns.map(column => {
      const value = row[column]
      if (value === null || value === undefined) return ""
      if (typeof value === "object") return quoteField(JSON.stringify(value))
      return quoteField(String(value))
    })
    lines.push(line.join(","))
  }

  return lines.join("\r\n")
}

type TCsvField = { value: string; wasQuoted: boolean }

function parseCsvLine(line: string): TCsvField[] {
  const fields: TCsvField[] = []
  let field = ""
  let inQuotes = false
  let wasQuoted = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (inQuotes) {
      if (char === "\"" && line[index + 1] === "\"") {
        field += "\""
        index++
      } else if (char === "\"") {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === "\"") {
      inQuotes = true
      wasQuoted = true
    } else if (char === ",") {
      fields.push({ value: field, wasQuoted })
      field = ""
      wasQuoted = false
    } else {
      field += char
    }
  }

  fields.push({ value: field, wasQuoted })
  return fields
}

/** Splits CSV text into records, respecting quoted newlines (a newline inside "..." is not a row break). */
function splitCsvRecords(text: string): string[] {
  const records: string[] = []
  let record = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]

    if (char === "\"") inQuotes = !inQuotes

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") index++
      if (record.length > 0) records.push(record)
      record = ""
    } else {
      record += char
    }
  }

  if (record.length > 0) records.push(record)
  return records
}

export function parseCsv(text: string): Record<string, string | null>[] {
  const records = splitCsvRecords(text)
  if (records.length === 0) return []

  const columns = parseCsvLine(records[0]).map(field => field.value)
  const rows: Record<string, string | null>[] = []

  for (let recordIndex = 1; recordIndex < records.length; recordIndex++) {
    const fields = parseCsvLine(records[recordIndex])
    const row: Record<string, string | null> = {}
    columns.forEach((column, columnIndex) => {
      const field = fields[columnIndex]
      row[column] = !field || (field.value === "" && !field.wasQuoted) ? null : field.value
    })
    rows.push(row)
  }

  return rows
}
