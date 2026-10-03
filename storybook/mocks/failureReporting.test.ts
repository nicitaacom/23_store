import { afterEach, describe, expect, it, vi } from "vitest";

const originalConsoleError = console.error;

afterEach(() => {
  console.error = originalConsoleError;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("reportStorybookFailures", () => {
  it("installs one console handler across module reloads and reports the first error once", async () => {
    const pendingReports: Array<() => void> = [];
    const originalReport = vi.fn();
    console.error = originalReport;
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("queueMicrotask", (callback: () => void) => pendingReports.push(callback));

    const firstModule = await import("./failureReporting");
    firstModule.reportStorybookFailures();
    const firstHandler = console.error;

    vi.resetModules();
    const reloadedModule = await import("./failureReporting");
    reloadedModule.reportStorybookFailures();

    expect(console.error).toBe(firstHandler);
    console.error("first failure");
    console.error("later failure");
    expect(originalReport).toHaveBeenCalledTimes(2);
    expect(pendingReports).toHaveLength(1);
    expect(pendingReports[0]).toThrow("Unexpected console error: first failure");
  });
});
