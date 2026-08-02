"use client"

import { useEffect, useState } from "react"
import { FiRefreshCw } from "react-icons/fi"
import { MdCheck, MdOutlineEmail } from "react-icons/md"

import { reportErrorToSupport } from "@/functions/support/reportErrorToSupport"
import { useI18n, useScopedI18n } from "@/locales/client"
import { useIsOnline } from "@/hooks/useIsOnline"
import { Button } from "@/components/ui"

type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}

type TReportStatus = "idle" | "sending" | "sent" | "failed"

// Recoverable boundary for the locale segment. Replaces Next.js's bare
// "Application error" page so a transient failure (e.g. a request made while
// the connection dropped) shows a branded message + retry instead of an empty stop.
export default function LocaleError({ error, reset }: ErrorBoundaryProps) {
  const t = useScopedI18n("common")
  const tGlobal = useI18n()
  const isOnline = useIsOnline()
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  const [reportStatus, setReportStatus] = useState<TReportStatus>("idle")

  useEffect(() => {
    console.error("[LocaleError]", error)
  }, [error])

  const errorDetails = [error.digest ? `Error ID: ${error.digest}` : null, error.message ? `Message: ${error.message}` : null]
    .filter((line): line is string => Boolean(line))
    .join("\n")

  async function handleReportToSupport() {
    setReportStatus("sending")
    const reportErrorToSupportResp = await reportErrorToSupport(tGlobal, error.message, error.digest)
    setReportStatus(reportErrorToSupportResp.success ? "sent" : "failed")
  }

  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-title">{t("something_went_wrong")}</h1>
        {!isOnline && <p className="text-sm text-danger">{t("no_internet_connection")}</p>}

        {errorDetails && (
          <div className="flex w-full max-w-lg flex-col gap-1 text-left">
            <span className="text-xs text-subTitle">{t("error_details")}</span>
            <pre className="max-w-full select-all whitespace-pre-wrap break-words rounded border border-border-color/35 bg-foreground/35 p-3 text-xs text-title">
              {errorDetails}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            className="font-medium"
            variant="default-outline"
            size="md"
            rounded="lg"
            onClick={reset}
            rightIcon={<FiRefreshCw className="text-sm" />}>
            {t("try_again")}
          </Button>
          <Button
            className="font-medium"
            variant="default-outline"
            size="md"
            rounded="lg"
            onClick={handleReportToSupport}
            disabled={reportStatus === "sent"}
            loading={reportStatus === "sending"}
            loadingText={t("reporting_to_support")}
            rightIcon={reportStatus === "sent" ? <MdCheck className="text-sm" /> : <MdOutlineEmail className="text-sm" />}>
            {reportStatus === "sent" ? t("report_sent") : t("report_to_support")}
          </Button>
        </div>

        {reportStatus === "failed" && <p className="text-xs text-danger">{t("report_failed", { email: supportEmail })}</p>}
      </div>
    </main>
  )
}
