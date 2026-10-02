import { describe, expect, it } from "vitest"
import type { User } from "@supabase/supabase-js"

import { getSyncedAvatarUrl } from "./user"

const googleUser = {
  user_metadata: { avatar_url: "https://provider.example/avatar.jpg" },
  identities: [],
} as unknown as User

describe("getSyncedAvatarUrl", () => {
  it("keeps a saved custom avatar when an older row contains the provider photo", () => {
    expect(getSyncedAvatarUrl(["https://provider.example/avatar.jpg", "https://store.example/custom.png"], googleUser)).toBe(
      "https://store.example/custom.png",
    )
  })

  it("uses the provider photo when no custom avatar is stored", () => {
    expect(getSyncedAvatarUrl([null, ""], googleUser)).toBe("https://provider.example/avatar.jpg")
  })
})
