"use client"

import { formatBackupBytes, formatBackupSpeed } from "./functions/formatBackupTransfer"
import type { useDbBackup } from "./hooks/useDbBackup"
import { useScopedI18n } from "@/locales/client"
import { ProgressBar } from "@/components/ui"

interface DbBackupProgressCardProps {
  backup: ReturnType<typeof useDbBackup>
  isModalOpen: boolean
}

// http://localhost:6006/?path=/story/admin-admintools--backup
export function DbBackupProgressCard({ backup, isModalOpen }: DbBackupProgressCardProps) {
  const t = useScopedI18n("backup")
  const isExportingTables = backup.tablesExportPhase === "exporting"
  const isImportingTables = backup.tablesImportPhase === "importing"
  const isExportingFiles = backup.filesExportPhase === "exporting"
  const isImportingFiles = backup.filesImportPhase === "importing"

  if (!backup.isBusy || isModalOpen) return null

  const progress = isExportingTables
    ? backup.tablesExportProgress
    : isImportingTables
      ? backup.tablesImportProgress
      : isExportingFiles
        ? backup.filesExportBytesTotal > 0
          ? backup.filesExportBytesDone / backup.filesExportBytesTotal
          : 0
        : backup.filesImportBytesTotal > 0
          ? backup.filesImportBytesDone / backup.filesImportBytesTotal
          : 0
  const progressLabel = isExportingTables
    ? `${t("tab_tables")} · ${t("export_button")}`
    : isImportingTables
      ? backup.tablesImportLabel || `${t("tab_tables")} · ${t("import_button")}`
      : isExportingFiles
        ? backup.filesExportLabel || `${t("tab_files")} · ${t("export_button")}`
        : backup.filesImportLabel || `${t("tab_files")} · ${t("import_button")}`
  const transferredBytes = isExportingFiles
    ? { done: backup.filesExportBytesDone, total: backup.filesExportBytesTotal }
    : isImportingFiles
      ? { done: backup.filesImportBytesDone, total: backup.filesImportBytesTotal }
      : null
  const speedBytesPerMs = isExportingFiles
    ? backup.filesExportSpeedBytesPerMs
    : isImportingFiles
      ? backup.filesImportSpeedBytesPerMs
      : null

  return (
    <aside
      className="pointer-events-none fixed bottom-4 right-4 z-[1550] flex w-[min(calc(100vw-2rem),420px)] flex-col gap-2 rounded-lg border border-success/25 bg-modal-surface p-3 shadow-compact-lg"
      aria-label={t("title")}
      aria-live="polite"
      role="status">
      <h2 className="text-sm font-semibold text-title">{t("title")}</h2>
      <ProgressBar label={progressLabel} value={progress} />
      {transferredBytes && (
        <div className="flex items-center justify-between gap-3 text-xs text-subTitle">
          <span>
            {formatBackupBytes(transferredBytes.done)} / {formatBackupBytes(transferredBytes.total)}
          </span>
          {speedBytesPerMs !== null && (
            <span>
              {t("speed_label")}: {formatBackupSpeed(speedBytesPerMs)}
            </span>
          )}
        </div>
      )}
    </aside>
  )
}
