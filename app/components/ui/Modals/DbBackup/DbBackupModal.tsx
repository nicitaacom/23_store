"use client"

import { useState } from "react"
import { BiDownload, BiUpload } from "react-icons/bi"

import { useDbBackup } from "./hooks/useDbBackup"
import { BackupFilesProgress } from "./BackupFilesProgress"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { useScopedI18n } from "@/locales/client"
import { Button, ProgressBar } from "@/components/ui"

type TBackupTab = "tables" | "files"

const TABS: { value: TBackupTab; labelKey: "tab_tables" | "tab_files" }[] = [
  { value: "tables", labelKey: "tab_tables" },
  { value: "files", labelKey: "tab_files" },
]

function StorageRelinkResult({ result }: { result: API.BackupStorageRelinkResult }) {
  const t = useScopedI18n("backup")
  const tableResults = result.tables.filter(table => table.urlsUpdated > 0 || table.unresolvedReferences > 0)

  return (
    <div className="flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
      <p className="text-xs text-success">{t("relink_result", { count: result.urlsUpdated })}</p>
      {result.unresolvedReferences > 0 && (
        <p className="text-xs text-warning">
          {t("unresolved_result", {
            references: result.unresolvedReferences,
            paths: result.unresolvedPaths,
          })}
        </p>
      )}
      {tableResults.map(table => (
        <div className="flex items-center justify-between gap-2 text-xs text-subTitle" key={table.table}>
          <span>{table.table}</span>
          <span>{t("relink_table_result", { updated: table.urlsUpdated, unresolved: table.unresolvedReferences })}</span>
        </div>
      ))}
    </div>
  )
}

// http://localhost:6006/?path=/story/admin-admintools--utm-stats
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
    filesExportLabel,
    filesExportStartedAt,
    filesExportFinishedAt,
    filesExportError,
    startExportFiles,
    filesImportPhase,
    filesImportBytesDone,
    filesImportBytesTotal,
    filesImportSpeedBytesPerMs,
    filesImportLabel,
    filesImportStartedAt,
    filesImportFinishedAt,
    filesImportResult,
    filesImportError,
    handleFilesImportClick,
    handleFilesFileChange,
    setModalOpen,
  } = useDbBackup()
  const [tab, setTab] = useState<TBackupTab>("tables")

  const isExportingTables = tablesExportPhase === "exporting"
  const isImportingTables = tablesImportPhase === "importing"
  const isExportingFiles = filesExportPhase === "exporting"
  const isImportingFiles = filesImportPhase === "importing"

  return (
    <ModalQueryContainer
      className="flex w-[min(94vw,460px)] flex-col gap-3 p-4 max-[767px]:gap-0 max-[767px]:p-0 max-[767px]:[&_button]:min-h-[44px]"
      ignoreInputs={false}
      modalQuery="DbBackup"
      onVisibilityChange={setModalOpen}>
      <div
        className="panel-scroll flex flex-col gap-3 p-4 max-[767px]:min-h-0 max-[767px]:flex-1 max-[767px]:gap-2 max-[767px]:overflow-y-auto max-[767px]:p-2 max-[767px]:pt-14"
        data-cy="db-backup-content">
        <div className="flex flex-col gap-1 pr-12">
          <h1 className="text-lg font-semibold text-title">{t("title")}</h1>
          <p className="text-sm text-subTitle">{t("subtitle")}</p>
        </div>

        <div className="flex gap-1 rounded border border-border-color/35 bg-foreground/5 p-1">
          {TABS.map(option => (
            <Button
              className="flex-1 max-[767px]:min-h-[44px]"
              data-cy={`backup-tab-${option.value}`}
              key={option.value}
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
            <span className="w-fit rounded border border-success/25 px-2 py-1 text-xs text-success" data-cy="backup-tables-provider">Supabase</span>
            <p className="text-xs text-subTitle">{t("tables_subtitle")}</p>
            <p className="text-xs text-warning">{t("tables_import_notice")}</p>

            <Button
              className="w-fit"
              data-cy="backup-export-tables"
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
              className="w-fit"
              data-cy="backup-import-tables"
              type="button"
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
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
                  <li className="flex items-center justify-between text-xs text-subTitle">
                    <span>{t("accounts_label")}</span>
                    <span>
                      {t("accounts_result", {
                        created: tablesImportResult.accounts.created,
                        reused: tablesImportResult.accounts.reused,
                      })}
                    </span>
                  </li>
                  {tablesImportResult.accounts.passwordResetRequired > 0 && (
                    <li className="text-xs text-warning">
                      {t("password_recovery_result", {
                        count: tablesImportResult.accounts.passwordResetRequired,
                      })}
                    </li>
                  )}
                  {tablesImportResult.tables.map(table => (
                    <li className="flex items-center justify-between text-xs text-subTitle" key={table.table}>
                      <span>{table.table}</span>
                      <span>
                        {table.rows} rows{table.skipped > 0 ? ` (${table.skipped} skipped)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <StorageRelinkResult result={tablesImportResult.relink} />
              </div>
            )}
          </div>
        )}

        {tab === "files" && (
          <div className="flex flex-col gap-3 rounded border border-border-color/35 bg-foreground/5 p-3">
            <p className="text-xs text-subTitle">{t("files_subtitle")}</p>
            <span className="w-fit rounded border border-success/25 px-2 py-1 text-xs text-success" data-cy="backup-files-provider">R2</span>

            <Button
              className="w-fit"
              data-cy="backup-export-files"
              variant="default"
              size="sm"
              leftIcon={<BiDownload size={14} />}
              loading={isExportingFiles}
              disabled={isBusy}
              onClick={startExportFiles}>
              {t("export_button")}
            </Button>
            {filesExportPhase !== "idle" && (
              <BackupFilesProgress
                bytesDone={filesExportBytesDone}
                bytesTotal={filesExportBytesTotal}
                speedBytesPerMs={filesExportSpeedBytesPerMs}
                label={filesExportLabel}
                startedAt={filesExportStartedAt}
                finishedAt={filesExportFinishedAt}
              />
            )}
            {filesExportPhase === "error" && <p className="text-xs text-danger">{filesExportError}</p>}

            <Button
              className="w-fit"
              data-cy="backup-import-files"
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<BiUpload size={14} />}
              loading={isImportingFiles}
              disabled={isBusy}
              onClick={handleFilesImportClick}>
              {t("import_button")}
            </Button>
            <input className="hidden" type="file" accept=".tar.gz,.gz,.tgz" ref={filesInputRef} onChange={handleFilesFileChange} />
            {filesImportPhase !== "idle" && (
              <BackupFilesProgress
                bytesDone={filesImportBytesDone}
                bytesTotal={filesImportBytesTotal}
                speedBytesPerMs={filesImportSpeedBytesPerMs}
                label={filesImportLabel}
                startedAt={filesImportStartedAt}
                finishedAt={filesImportFinishedAt}
              />
            )}
            {filesImportPhase === "error" && <p className="text-xs text-danger">{filesImportError}</p>}

            {filesImportResult && filesImportPhase === "done" && (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-0.5 border-t border-border-color/35 pt-2">
                  {filesImportResult.buckets.map(bucket => (
                    <li className="flex min-w-0 items-start justify-between gap-2 text-xs text-subTitle" key={bucket.bucket}>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{bucket.bucket}</span>
                      <span className="shrink-0">
                        {bucket.files} files{bucket.failed > 0 ? ` (${bucket.failed} failed)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {filesImportResult.relink ? <StorageRelinkResult result={filesImportResult.relink} /> : (
                  <p className="border-t border-border-color/35 pt-2 text-xs text-warning">
                    Files copied. Live image URLs are unchanged; complete final synchronization before switching storage.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalQueryContainer>
  )
}
