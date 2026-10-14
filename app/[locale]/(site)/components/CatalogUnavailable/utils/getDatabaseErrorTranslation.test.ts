import { describe, expect, it } from "vitest"

import { getDatabaseErrorTranslation } from "./getDatabaseErrorTranslation"

describe("database error translation", () => {
  it("identifies the backend's unavailable server message without exposing English in other locales", () => {
    expect(getDatabaseErrorTranslation("no available server\n", 503)).toBe("catalog_database_no_server")
  })

  it("distinguishes missing configuration, rejected credentials, and no response", () => {
    expect(getDatabaseErrorTranslation("supabaseUrl is required.", 0)).toBe("catalog_database_configuration_missing")
    expect(getDatabaseErrorTranslation("Invalid API key", 401)).toBe("catalog_database_credentials_rejected")
    expect(getDatabaseErrorTranslation("TypeError: fetch failed", 0)).toBe("catalog_database_no_response")
  })

  it("names service errors and database query errors without guessing the configuration is wrong", () => {
    expect(getDatabaseErrorTranslation("Service unavailable", 503)).toBe("catalog_database_unavailable")
    expect(getDatabaseErrorTranslation("permission denied for table 23_products", 403)).toBe("catalog_database_query_rejected")
  })
})
