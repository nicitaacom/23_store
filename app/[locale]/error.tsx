"use client"

import { useEffect } from "react"
import { FiRefreshCw } from "react-icons/fi"

import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"
import { useIsOnline } from "@/hooks/useIsOnline"

type ErrorBoundaryProps = {
  error: Error & { digest?: string }
  reset: () => void
}

// Recoverable boundary for the locale segment. Replaces Next.js's bare
// "Application error" page so a transient failure (e.g. a request made while
// the connection dropped) shows a branded message + retry instead of a dead end.
export default function LocaleError({ error, reset }: ErrorBoundaryProps) {
  const t = useScopedI18n("common")
  const isOnline = useIsOnline()

  useEffect(() => {
    console.error("[LocaleError]", error)
  }, [error])

  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-title">{t("something_went_wrong")}</h1>
        {!isOnline && <p className="text-sm text-danger">{t("no_internet_connection")}</p>}
        <Button
          className="font-medium"
          variant="default-outline"
          size="md"
          rounded="lg"
          onClick={reset}
          rightIcon={<FiRefreshCw className="text-sm" />}>
          {t("try_again")}
        </Button>
      </div>
    </main>
  )
}
