let isFailureReportingActive = false;
let hasReportedConsoleError = false;

export function reportStorybookFailures() {
  if (isFailureReportingActive || typeof window === "undefined") return;

  isFailureReportingActive = true;
  const reportConsoleError = console.error.bind(console);
  console.error = (...messages: unknown[]) => {
    reportConsoleError(...messages);
    if (hasReportedConsoleError) return;
    hasReportedConsoleError = true;
    const details = messages.map(message => message instanceof Error ? message.message : String(message)).join(" ");
    queueMicrotask(() => {
      throw new Error(`Unexpected console error: ${details}`);
    });
  };

  window.addEventListener("unhandledrejection", event => {
    event.preventDefault();
    const rejection = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    queueMicrotask(() => {
      throw rejection;
    });
  });
}
