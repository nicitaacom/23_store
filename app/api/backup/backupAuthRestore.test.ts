import { describe, expect, it } from "vitest"

import { BACKUP_TABLES } from "./backupConfig"
import {
  mergeBackupPublicUserRows,
  remapAuthUserIds,
  selectBackupSourceUsers,
  selectReferencedAuthUserIds,
} from "./backupAuthRestore"

const SOURCE_USER_ID = "11111111-1111-4111-8111-111111111111"
const TARGET_USER_ID = "22222222-2222-4222-8222-222222222222"

function selectConfig(name: (typeof BACKUP_TABLES)[number]["name"]) {
  const config = BACKUP_TABLES.find(table => table.name === name)
  if (!config) throw new Error(`Missing backup config for ${name}`)
  return config
}

describe("backup Auth restore helpers", () => {
  it("normalizes archived public users for Auth preparation", () => {
    expect(
      selectBackupSourceUsers([
        {
          id: SOURCE_USER_ID,
          email: "  USER@Example.com ",
          username: " User ",
          avatar_url: "https://example.com/avatar.png",
          email_confirmed_at: "2026-01-01T00:00:00Z",
          providers: ["credentials"],
        },
      ]),
    ).toEqual([
      {
        id: SOURCE_USER_ID,
        email: "user@example.com",
        username: "User",
        avatarUrl: "https://example.com/avatar.png",
        emailConfirmedAt: "2026-01-01T00:00:00Z",
        providers: ["credentials"],
      },
    ])
  })

  it("collects UUID Auth references and ignores anonymous text ids", () => {
    expect(
      selectReferencedAuthUserIds([
        {
          config: selectConfig("23_tickets"),
          rows: [{ owner_id: SOURCE_USER_ID }, { owner_id: "anonymousId_example" }],
        },
        {
          config: selectConfig("23_personalized_designs"),
          rows: [{ owner_id: SOURCE_USER_ID, user_id: "anonymousId_buyer" }],
        },
      ]),
    ).toEqual([SOURCE_USER_ID])
  })

  it("remaps every configured user reference and marks credential recovery", () => {
    const mapping = [{ sourceUserId: SOURCE_USER_ID, targetUserId: TARGET_USER_ID, passwordResetRequired: true }]

    expect(remapAuthUserIds(selectConfig("23_users"), [{ id: SOURCE_USER_ID }], mapping)).toEqual([
      { id: TARGET_USER_ID, password_reset_required: true },
    ])
    expect(
      remapAuthUserIds(
        selectConfig("23_personalized_designs"),
        [{ owner_id: SOURCE_USER_ID, user_id: SOURCE_USER_ID }],
        mapping,
      ),
    ).toEqual([{ owner_id: TARGET_USER_ID, user_id: TARGET_USER_ID }])
    expect(remapAuthUserIds(selectConfig("23_tickets"), [{ owner_id: "anonymousId_example" }], mapping)).toEqual([
      { owner_id: "anonymousId_example" },
    ])
  })

  it("preserves target roles and providers while restoring profile fields", () => {
    expect(
      mergeBackupPublicUserRows(
        [{ id: TARGET_USER_ID, username: "Backup", roles: ["USER"], providers: ["credentials"] }],
        [{ id: TARGET_USER_ID, username: "Target", roles: ["ADMIN"], providers: ["google"] }],
      ),
    ).toEqual([
      {
        id: TARGET_USER_ID,
        username: "Backup",
        roles: ["ADMIN", "USER"],
        providers: ["google", "credentials"],
      },
    ])
  })

  it("keeps the complete table-to-user-column contract", () => {
    expect(Object.fromEntries(BACKUP_TABLES.map(table => [table.name, table.authUserIdColumns]))).toEqual({
      "23_users": ["id"],
      "23_users_cart": ["id"],
      "23_categories": [],
      "23_category_views": ["user_id"],
      "23_products": ["owner_id"],
      "23_ai_price_runs": [],
      "23_ai_price_proposals": ["owner_id"],
      "23_personalized_designs": ["user_id", "owner_id"],
      "23_tickets": ["owner_id"],
      "23_messages": ["sender_id"],
    })
  })
})
