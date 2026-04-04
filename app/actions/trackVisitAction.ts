"use server"

import { trackUTMVisit } from "@/api/utm/track/trackUTMVisit"

export async function trackVisitAction(
  userId: string | undefined,
  searchParams: { [key: string]: string | string[] | undefined } = {},
) {
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )

  await trackUTMVisit(userId, normalizedSearchParams)
}
