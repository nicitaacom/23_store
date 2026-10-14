import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCatalogRecovery } from "./useCatalogRecovery"

const { state, refresh } = vi.hoisted(() => ({ state: { attempt: 0, pending: false }, refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("react", () => ({
  useEffect: vi.fn(),
  useState: () => [
    state.attempt,
    (value: number | ((attempt: number) => number)) => {
      state.attempt = typeof value === "function" ? value(state.attempt) : value
    },
  ],
  useTransition: () => [state.pending, (callback: () => void) => callback()],
}))

function runRecoveryEffect(autoRecover = true) {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Drive a mocked hook render to verify retry timers and cleanup.
  const handlers = useCatalogRecovery(autoRecover)
  const cleanup = vi.mocked(useEffect).mock.calls.at(-1)![0]()
  return { ...handlers, cleanup }
}

describe("automatic catalog recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    state.attempt = 0
    state.pending = false
  })

  afterEach(() => vi.useRealTimers())

  it("refreshes at most three times with increasing delays", () => {
    for (const delay of [5000, 10000, 20000]) {
      runRecoveryEffect()
      vi.advanceTimersByTime(delay)
    }
    expect(runRecoveryEffect().isRecovering).toBe(false)
    vi.advanceTimersByTime(60000)
    expect(refresh).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cancels the scheduled read when the unavailable component is removed", () => {
    const { cleanup } = runRecoveryEffect()
    if (typeof cleanup === "function") cleanup()
    vi.advanceTimersByTime(5000)
    expect(refresh).not.toHaveBeenCalled()
  })

  it("avoids retries for permanent failures and while a refresh is pending", () => {
    runRecoveryEffect(false)
    state.pending = true
    runRecoveryEffect()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("starts a new bounded sequence after a manual refresh", () => {
    state.attempt = 3
    runRecoveryEffect().handleRefreshCatalog()
    expect(state.attempt).toBe(0)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(runRecoveryEffect().isRecovering).toBe(true)
  })
})
