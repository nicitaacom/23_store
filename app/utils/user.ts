import { User } from "@supabase/supabase-js"

export function normalizeUser(user: User | null | undefined) {
  if (!user) return null

  return JSON.parse(JSON.stringify(user)) as User
}

export function sanitizeAvatarUrl(avatarUrl: string | null | undefined) {
  return typeof avatarUrl === "string" ? avatarUrl.trim() : ""
}

export function getUserName(user: User | null | undefined) {
  return user?.user_metadata.username || user?.user_metadata.name || user?.email || ""
}

export function getUserAvatarUrl(user: User | null | undefined) {
  const avatarUrl =
    user?.user_metadata.avatar_url ||
    user?.identities?.[0]?.identity_data?.avatar_url ||
    user?.identities?.[1]?.identity_data?.avatar_url ||
    ""

  return sanitizeAvatarUrl(avatarUrl)
}

export function getPreferredAvatarUrl(avatarUrlFromDB: string | null | undefined, user: User | null | undefined) {
  return sanitizeAvatarUrl(avatarUrlFromDB) || getUserAvatarUrl(user)
}
