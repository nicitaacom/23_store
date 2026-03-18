export class AccountSDK {
  async updateAvatarUrl(avatarUrl: string): Promise<API.UpdateAvatarResponse> {
    const response = await fetch("/api/account/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarUrl,
      } satisfies API.UpdateAvatarRequest),
    })

    const data = (await response.json()) as API.UpdateAvatarResponse & { error?: string }

    if (!response.ok) {
      throw new Error(data.error || "Failed to update avatar")
    }

    return data
  }
}
