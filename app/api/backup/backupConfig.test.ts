import { describe, expect, it } from "vitest"

import { applyBackupImportDefaults, getTableConfig } from "./backupConfig"

describe("backup import defaults", () => {
  it("restores the empty ticket message used by older archives", () => {
    const config = getTableConfig("23_tickets")
    if (!config) throw new Error("23_tickets backup config is missing")

    expect(applyBackupImportDefaults(config, [{ id: "ticket-1", last_message_body: null }])).toEqual([
      { id: "ticket-1", last_message_body: "" },
    ])
  })

  it("restores the empty message body used by older archives", () => {
    const config = getTableConfig("23_messages")
    if (!config) throw new Error("23_messages backup config is missing")

    expect(applyBackupImportDefaults(config, [{ id: "message-1", body: null }])).toEqual([{ id: "message-1", body: "" }])
  })

  it("does not replace nullable values without an empty-string default", () => {
    const config = getTableConfig("23_messages")
    if (!config) throw new Error("23_messages backup config is missing")

    const rows = [{ id: "message-1", sender_avatar_url: null }]
    expect(applyBackupImportDefaults(config, rows)).toEqual(rows)
  })
})
