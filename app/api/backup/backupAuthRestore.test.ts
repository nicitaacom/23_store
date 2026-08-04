import { describe, expect, it } from "vitest"
import type { User } from "@supabase/supabase-js"

import {
  mergeBackupPublicUserRows,
  remapAuthUserIds,
  selectBackupSourceUsers,
  selectMissingBackupPublicUsers,
  selectReferencedAuthUserIds,
} from "./backupAuthRestore"
import { BACKUP_TABLES } from "./backupConfig"

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

  it("collects only required Auth FK references and ignores historical text ids", () => {
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
    expect(Object.fromEntries(BACKUP_TABLES.map(table => [table.name, table.requiredAuthUserIdColumns]))).toEqual({
      "23_users": ["id"],
      "23_users_cart": ["id"],
      "23_categories": [],
      "23_category_views": [],
      "23_products": ["owner_id"],
      "23_ai_price_runs": [],
      "23_ai_price_proposals": [],
      "23_personalized_designs": ["owner_id"],
      "23_tickets": [],
      "23_messages": [],
    })
    expect(Object.fromEntries(BACKUP_TABLES.map(table => [table.name, table.storageUrlColumns ?? []]))).toEqual({
      "23_users": ["avatar_url"],
      "23_users_cart": [],
      "23_categories": [],
      "23_category_views": [],
      "23_products": ["img_url", "variants", "personalization"],
      "23_ai_price_runs": [],
      "23_ai_price_proposals": ["proposed_variants"],
      "23_personalized_designs": ["source_url"],
      "23_tickets": ["owner_avatar_url"],
      "23_messages": ["images", "sender_avatar_url"],
    })
    expect(BACKUP_TABLES.find(table => table.name === "23_products")?.jsonColumns).toContain("personalization")
  })

  it("creates missing public backup profiles from referenced Auth users", () => {
    const authUser = {
      id: SOURCE_USER_ID,
      aud: "authenticated",
      email: "OWNER@Example.com",
      created_at: "2023-11-28T11:33:11Z",
      email_confirmed_at: "2023-11-28T11:33:09Z",
      app_metadata: { providers: ["google", "email"] },
      user_metadata: { full_name: "Nikita", avatar_url: "https://example.com/avatar.png" },
      identities: [],
    } as User

    expect(selectMissingBackupPublicUsers([], [SOURCE_USER_ID], [authUser])).toEqual([
      {
        id: SOURCE_USER_ID,
        created_at: "2023-11-28T11:33:11Z",
        username: "Nikita",
        email: "owner@example.com",
        avatar_url: "https://example.com/avatar.png",
        roles: ["USER"],
        email_confirmed_at: "2023-11-28T11:33:09Z",
        providers: ["google", "credentials"],
        password_reset_required: false,
        ai_pricing_enabled: false,
      },
    ])
  })
})
