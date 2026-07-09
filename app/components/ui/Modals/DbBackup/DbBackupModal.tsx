"use client"

import { BiDownload, BiUpload } from "react-icons/bi"

import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { useDbBackup } from "./hooks/useDbBackup"
import { Button, ProgressBar } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"

export function DbBackupModal() {
  const t = useScopedI18n("backup")
  const {
    isExporting,
    isImporting,
    exportProgress,
    importProgress,
    results,
    buckets,
    fileInputRef,
    exportFn,
    handleImportClick,
    handleFileChange,
  } = useDbBackup()

  return (
    <ModalQueryContainer
      className="flex w-[min(94vw,460px)] flex-col gap-3 p-4"
      ignoreInputs={false}
      modalQuery="DbBackup">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-title">{t("title")}</h1>
        <p className="text-sm text-subTitle">{t("subtitle")}</p>
      </div>

      <div className="rounded border border-border-color/35 bg-foreground/5 p-3">
        <h2 className="text-sm font-medium text-title">{t("export_title")}</h2>
        <p className="mt-0.5 text-xs text-subTitle">{t("export_subtitle")}</p>
        <Button
          className="mt-2 w-fit"
          variant="default"
          size="sm"
          leftIcon={<BiDownload size={14} />}
          loading={isExporting}
          disabled={isImporting}
          onClick={exportFn}>
          {t("export_button")}
        </Button>
        {isExporting && <ProgressBar className="mt-2" value={exportProgress} label={t("export_progress")} />}
      </div>

      <div className="rounded border border-border-color/35 bg-foreground/5 p-3">
        <h2 className="text-sm font-medium text-title">{t("import_title")}</h2>
        <p className="mt-0.5 text-xs text-subTitle">{t("import_subtitle")}</p>
        <Button
          className="mt-2 w-fit"
          variant="secondary"
          size="sm"
          leftIcon={<BiUpload size={14} />}
          loading={isImporting}
          disabled={isExporting}
          onClick={handleImportClick}>
          {t("import_button")}
        </Button>
        <input
          className="hidden"
          type="file"
          accept=".gz,.tar.gz,application/gzip"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        {isImporting && <ProgressBar className="mt-2" value={importProgress} label={t("import_progress")} />}

        {results.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5">
            {results.map(result => (
              <li
                className={`flex items-center justify-between text-xs ${result.error ? "text-danger" : "text-subTitle"}`}
                key={result.table}>
                <span>{result.table}</span>
                <span>
                  {result.error
                    ? result.error
                    : `${result.imported} rows${result.skipped ? ` (${result.skipped} skipped)` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {buckets.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
            {buckets.map(bucket => (
              <li
                className={`flex items-center justify-between text-xs ${bucket.error ? "text-danger" : "text-subTitle"}`}
                key={bucket.bucket}>
                <span>{bucket.bucket}</span>
                <span>
                  {bucket.error
                    ? bucket.error
                    : `${bucket.uploaded} files${bucket.failed ? ` (${bucket.failed} failed)` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalQueryContainer>
  )
}
