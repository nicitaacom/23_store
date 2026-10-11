"use client"

import { formatBackupBytes, formatBackupDuration, formatBackupSpeed } from "./functions/formatBackupTransfer"
import { useBackupTransferTime } from "./hooks/useBackupTransferTime"
import { useScopedI18n } from "@/locales/client"
import { ProgressBar } from "@/components/ui/ProgressBar"

type TBackupFilesProgressProps = {
  bytesDone: number
  bytesTotal: number
  label: string
  speedBytesPerMs: number | null
  startedAt: number | null
  finishedAt: number | null
}

// http://localhost:6006/?path=/story/admin-admintools--backup-copy-to-r2
export function BackupFilesProgress({ bytesDone, bytesTotal, label, speedBytesPerMs, startedAt, finishedAt }: TBackupFilesProgressProps) {
  const t = useScopedI18n("backup")
  const { elapsed, remaining } = useBackupTransferTime(startedAt, finishedAt, bytesDone, bytesTotal, speedBytesPerMs)

  return (
    <div className="flex min-w-0 flex-col gap-2" data-cy="backup-files-progress">
      <ProgressBar label={label} labelClassName="line-clamp-2 min-h-[2rem]" value={bytesTotal > 0 ? bytesDone / bytesTotal : 0} />
      <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-xs text-subTitle [&>div]:min-w-0 [&_dd]:tabular-nums [&_dd]:[overflow-wrap:anywhere]">
        <div><dt>{t("transferred_label")}</dt><dd>{formatBackupBytes(bytesDone)} / {formatBackupBytes(bytesTotal)}</dd></div>
        <div><dt>{t("speed_label")}</dt><dd>{speedBytesPerMs !== null ? formatBackupSpeed(speedBytesPerMs) : "—"}</dd></div>
        <div><dt>{t("elapsed_label")}</dt><dd>{formatBackupDuration(elapsed)}</dd></div>
        <div><dt>{t("remaining_label")}</dt><dd>{remaining !== null ? formatBackupDuration(remaining) : finishedAt === null && bytesTotal > 0 && bytesDone >= bytesTotal ? t("finalizing") : "—"}</dd></div>
      </dl>
    </div>
  )
}
