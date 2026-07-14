let isFailureReportingActive = false;

export function reportStorybookFailures() {
  if (isFailureReportingActive || typeof window === "undefined") return;

  isFailureReportingActive = true;
  window.addEventListener("unhandledrejection", event => {
    event.preventDefault();
    const rejection = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    queueMicrotask(() => {
      throw rejection;
    });
  });
}
