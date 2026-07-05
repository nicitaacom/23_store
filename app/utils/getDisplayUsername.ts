/**
 *
 * Anonymous senders are identified by the `anonymousId_<uuid>` cookie value (see `setAnonymousId.ts`).
 * That raw id isn't a name - rendering it directly in support tickets shows a wall of UUIDs.
 * This turns `anonymousId_4gu95e6IEKjATNJFxOAL7` into `Guest 4gu95e6i`.
 *
 * Authenticated user ids are returned unchanged - `publicUserSync.ts` backfills `owner_username`
 * with the real username once the user is merged, so this is only a display fallback until then.
 *
 * @returns display username
 */
export function getDisplayUsername(senderId: string): string {
  if (!senderId.startsWith("anonymousId_")) return senderId

  const rawId = senderId.replace("anonymousId_", "")
  return `Guest ${rawId.slice(0, 8).toLowerCase()}`
}
