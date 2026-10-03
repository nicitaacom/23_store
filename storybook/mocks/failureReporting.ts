interface FailureReportingWindow extends Window {
  __jokiStorybookFailureReporting?: { hasReportedError: boolean };
}

export function reportStorybookFailures() {
  if (typeof window === "undefined") return;
  const reporterWindow = window as FailureReportingWindow;
  if (reporterWindow.__jokiStorybookFailureReporting) return;

  const state = { hasReportedError: false };
  reporterWindow.__jokiStorybookFailureReporting = state;
  const reportConsoleError = console.error.bind(console);
  console.error = (...messages: unknown[]) => {
    const isFirstError = !state.hasReportedError;
    state.hasReportedError = true;
    reportConsoleError(...messages);
    if (!isFirstError) return;
    const details = messages.map(message => message instanceof Error ? message.message : String(message)).join(" ");
    queueMicrotask(() => {
      throw new Error(`Unexpected console error: ${details}`);
    });
  };

  window.addEventListener("unhandledrejection", event => {
    event.preventDefault();
    state.hasReportedError = true;
    const rejection = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    queueMicrotask(() => {
      throw rejection;
    });
  });
}
