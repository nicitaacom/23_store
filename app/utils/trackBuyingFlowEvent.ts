"use client"

import { IBuyingFlowEventInput } from "@/ts/interfaces/IBuyingFlowEventInput"
import { useDeviceIdStore } from "@/store/user/useDeviceIdStore"
import { trackBuyingFlowEventAction } from "@/actions/trackBuyingFlowEventAction"

const SESSION_ID_KEY = "buying-flow:session-id"

function getVisitorId(): string | null {
  return useDeviceIdStore.getState().storedDeviceId
}

function getSessionId(): string {
  const existingSessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (existingSessionId) return existingSessionId

  const sessionId = crypto.randomUUID()
  sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  return sessionId
}

function getLocale(): string {
  return document.documentElement.lang || window.location.pathname.split("/").filter(Boolean)[0] || "en"
}

export function trackBuyingFlowEvent(
  eventInput: Pick<
    IBuyingFlowEventInput,
    "event" | "productId" | "checkoutKind" | "searchQuery" | "resultsCount"
  >,
): void {
  if (typeof window === "undefined") return

  try {
    const sessionId = getSessionId()
    const orderPlacedKey = `buying-flow:order-placed:${sessionId}`
    if (eventInput.event === "order_placed" && sessionStorage.getItem(orderPlacedKey)) return
    if (eventInput.event === "order_placed") sessionStorage.setItem(orderPlacedKey, "1")

    void trackBuyingFlowEventAction({
      ...eventInput,
      storedDeviceId: getVisitorId(),
      sessionId,
      pageUrl: window.location.href,
      locale: getLocale(),
    }).catch(error => console.error("Buying-flow event failed", error))
  } catch (error) {
    console.error("Buying-flow event failed", error)
  }
}
