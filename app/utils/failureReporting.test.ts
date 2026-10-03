import { describe, expect, it, vi } from "vitest"

import { reportStorybookFailures } from "../../storybook/mocks/failureReporting"

describe("reportStorybookFailures", () => {
  it("reports the first console error only once", () => {
    const originalConsoleError = console.error
    const queuedReports: (() => void)[] = []
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("window", { addEventListener: vi.fn() })
    vi.stubGlobal("queueMicrotask", (report: () => void) => queuedReports.push(report))

    try {
      reportStorybookFailures()
      console.error("first problem")
      console.error("Unexpected console error: first problem")

      expect(queuedReports).toHaveLength(1)
      expect(queuedReports[0]).toThrow("Unexpected console error: first problem")
    } finally {
      console.error = originalConsoleError
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    }
  })
})
