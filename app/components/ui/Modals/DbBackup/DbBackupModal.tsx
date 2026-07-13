"use client"

import { useState } from "react"
import { BiDownload, BiUpload } from "react-icons/bi"

import { useDbBackup } from "./hooks/useDbBackup"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { useScopedI18n } from "@/locales/client"
import { Button, ProgressBar } from "@/components/ui"

type TBackupTab = "tables" | "files"

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatSpeed(bytesPerMs: number): string {
  return `${formatBytes(bytesPerMs * 1000)}/s`
}

const TABS: { value: TBackupTab; labelKey: "tab_tables" | "tab_files" }[] = [
  { value: "tables", labelKey: "tab_tables" },
  { value: "files", labelKey: "tab_files" },
]

export function DbBackupModal() {
  const t = useScopedI18n("backup")
  const {
    isBusy,
    tablesInputRef,
    filesInputRef,
    tablesExportPhase,
    tablesExportProgress,
    tablesExportError,
    startExportTables,
    tablesImportPhase,
    tablesImportProgress,
    tablesImportLabel,
    tablesImportResult,
    tablesImportError,
    handleTablesImportClick,
    handleTablesFileChange,
    filesExportPhase,
    filesExportBytesDone,
    filesExportBytesTotal,
    filesExportSpeedBytesPerMs,
    filesExportError,
    startExportFiles,
    filesImportPhase,
    filesImportBytesDone,
    filesImportBytesTotal,
    filesImportSpeedBytesPerMs,
    filesImportLabel,
    filesImportResult,
    filesImportError,
    handleFilesImportClick,
    handleFilesFileChange,
  } = useDbBackup()
  const [tab, setTab] = useState<TBackupTab>("tables")

  const isExportingTables = tablesExportPhase === "exporting"
  const isImportingTables = tablesImportPhase === "importing"
  const isExportingFiles = filesExportPhase === "exporting"
  const isImportingFiles = filesImportPhase === "importing"

  return (
    <ModalQueryContainer className="flex w-[min(94vw,460px)] flex-col gap-3 p-4" ignoreInputs={false} modalQuery="DbBackup">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-title">{t("title")}</h1>
        <p className="text-sm text-subTitle">{t("subtitle")}</p>
      </div>

      <div className="flex gap-1 rounded border border-border-color/35 bg-foreground/5 p-1">
        {TABS.map(option => (
          <Button
            key={option.value}
            className="flex-1"
            variant={tab === option.value ? "default" : "ghost"}
            size="sm"
            disabled={isBusy}
            onClick={() => setTab(option.value)}>
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      {tab === "tables" && (
        <div className="flex flex-col gap-3 rounded border border-border-color/35 bg-foreground/5 p-3">
          <p className="text-xs text-subTitle">{t("tables_subtitle")}</p>

          <Button
            className="w-fit"
            variant="default"
            size="sm"
            leftIcon={<BiDownload size={14} />}
            loading={isExportingTables}
            disabled={isBusy}
            onClick={startExportTables}>
            {t("export_button")}
          </Button>
          {isExportingTables && <ProgressBar value={tablesExportProgress} />}
          {tablesExportPhase === "error" && <p className="text-xs text-danger">{tablesExportError}</p>}

          <Button
            type="button"
            className="w-fit"
            variant="secondary"
            size="sm"
            leftIcon={<BiUpload size={14} />}
            loading={isImportingTables}
            disabled={isBusy}
            onClick={handleTablesImportClick}>
            {t("import_button")}
          </Button>
          <input
            className="hidden"
            type="file"
            accept=".csv,.tar.gz,.gz,.tgz"
            multiple
            ref={tablesInputRef}
            onChange={handleTablesFileChange}
          />
          {isImportingTables && <ProgressBar value={tablesImportProgress} label={tablesImportLabel} />}
          {tablesImportPhase === "error" && <p className="text-xs text-danger">{tablesImportError}</p>}

          {tablesImportResult && tablesImportPhase === "done" && (
            <ul className="flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
              {tablesImportResult.tables.map(table => (
                <li key={table.table} className="flex items-center justify-between text-xs text-subTitle">
                  <span>{table.table}</span>
                  <span>
                    {table.rows} rows{table.skipped > 0 ? ` (${table.skipped} skipped)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "files" && (
        <div className="flex flex-col gap-3 rounded border border-border-color/35 bg-foreground/5 p-3">
          <p className="text-xs text-subTitle">{t("files_subtitle")}</p>

          <Button
            className="w-fit"
            variant="default"
            size="sm"
            leftIcon={<BiDownload size={14} />}
            loading={isExportingFiles}
            disabled={isBusy}
            onClick={startExportFiles}>
            {t("export_button")}
          </Button>
          {isExportingFiles && (
            <div className="flex flex-col gap-1">
              <ProgressBar value={filesExportBytesTotal > 0 ? filesExportBytesDone / filesExportBytesTotal : 0} />
              <div className="flex items-center justify-between text-xs text-subTitle">
                <span>
                  {formatBytes(filesExportBytesDone)} / {formatBytes(filesExportBytesTotal)}
                </span>
                {filesExportSpeedBytesPerMs !== null && (
                  <span>
                    {t("speed_label")}: {formatSpeed(filesExportSpeedBytesPerMs)}
                  </span>
                )}
              </div>
            </div>
          )}
          {filesExportPhase === "error" && <p className="text-xs text-danger">{filesExportError}</p>}

          <Button
            type="button"
            className="w-fit"
            variant="secondary"
            size="sm"
            leftIcon={<BiUpload size={14} />}
            loading={isImportingFiles}
            disabled={isBusy}
            onClick={handleFilesImportClick}>
            {t("import_button")}
          </Button>
          <input className="hidden" type="file" accept=".tar.gz,.gz,.tgz" ref={filesInputRef} onChange={handleFilesFileChange} />
          {isImportingFiles && (
            <div className="flex flex-col gap-1">
              <ProgressBar
                value={filesImportBytesTotal > 0 ? filesImportBytesDone / filesImportBytesTotal : 0}
                label={filesImportLabel}
              />
              <div className="flex items-center justify-between text-xs text-subTitle">
                <span>
                  {formatBytes(filesImportBytesDone)} / {formatBytes(filesImportBytesTotal)}
                </span>
                {filesImportSpeedBytesPerMs !== null && (
                  <span>
                    {t("speed_label")}: {formatSpeed(filesImportSpeedBytesPerMs)}
                  </span>
                )}
              </div>
            </div>
          )}
          {filesImportPhase === "error" && <p className="text-xs text-danger">{filesImportError}</p>}

          {filesImportResult && filesImportPhase === "done" && (
            <ul className="flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
              {filesImportResult.buckets.map(bucket => (
                <li key={bucket.bucket} className="flex items-center justify-between text-xs text-subTitle">
                  <span>{bucket.bucket}</span>
                  <span>
                    {bucket.files} files{bucket.failed > 0 ? ` (${bucket.failed} failed)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ModalQueryContainer>
  )
}
