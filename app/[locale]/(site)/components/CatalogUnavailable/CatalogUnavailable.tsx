"use client"

import { FiRefreshCw } from "react-icons/fi"

import { getDatabaseErrorTranslation } from "./utils/getDatabaseErrorTranslation"
import { useCatalogRecovery } from "./hooks/useCatalogRecovery"
import { useScopedI18n } from "@/locales/client"
import { Button } from "@/components/ui/Button"

interface CatalogUnavailableProps {
  databaseMessage: string
  databaseStatus: number
  autoRecover: boolean
}

// http://localhost:6006/?path=/story/commerce-catalog--database-unavailable
export function CatalogUnavailable({ databaseMessage, databaseStatus, autoRecover }: CatalogUnavailableProps) {
  const t = useScopedI18n("product")
  const { handleRefreshCatalog, isPending, isRecovering } = useCatalogRecovery(autoRecover)
  const databaseErrorKey = getDatabaseErrorTranslation(databaseMessage, databaseStatus)

  return (
    <div
      className="flex min-h-full flex-col items-center justify-center gap-3 rounded-[4px] border border-warning/30 bg-background/60 px-6 py-12 text-center text-base"
      data-cy="catalog-unavailable"
      role="alert">
      <h2 className="text-xl font-semibold text-warning">{t("catalog_unavailable_title")}</h2>
      <p className="max-w-lg text-subTitle">{t("catalog_unavailable_description")}</p>
      <p className="max-w-lg text-title">{t(databaseErrorKey)}</p>
      {process.env.NODE_ENV === "development" && (
        <p className="max-w-lg text-sm text-subTitle">
          {t("catalog_development_hint", {
            urlVariable: "NEXT_PUBLIC_SUPABASE_URL",
            keyVariable: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          })}
        </p>
      )}
      <p className="text-sm text-subTitle">{t("catalog_unavailable_help")}</p>
      {(isRecovering || isPending) && (
        <p className="text-sm text-subTitle" role="status">
          {t("catalog_reconnecting")}
        </p>
      )}
      <details className="w-full max-w-lg text-left text-sm text-subTitle" open>
        <summary>{t("catalog_error_details")}</summary>
        <div className="mt-2 rounded border border-border-color/35 bg-foreground/35 p-3 text-sm text-title">
          <p>{t(databaseErrorKey)}</p>
          {databaseStatus > 0 && <p>{t("catalog_database_response", { status: databaseStatus })}</p>}
        </div>
      </details>
      <Button
        variant="default-outline"
        size="md"
        onClick={handleRefreshCatalog}
        loading={isPending}
        loadingText={t("catalog_reconnecting")}
        rightIcon={<FiRefreshCw />}>
        {t("catalog_refresh")}
      </Button>
    </div>
  )
}
