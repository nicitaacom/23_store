"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { selectDbBackupIsBusy, useDbBackupState } from "@/store/ui/useDbBackupState"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

export function useDbBackup() {
  const router = useRouter()
  const toast = useToast()
  const t = useScopedI18n("backup")
  const backup = useDbBackupState()

  const tablesInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  const downloadExportFile = useCallback((exportFile: Blob, name: string) => {
    const url = URL.createObjectURL(exportFile)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])
  const downloadExportFileRef = useRef(downloadExportFile)
  useEffect(() => {
    downloadExportFileRef.current = downloadExportFile
  })

  const startExportTables = useCallback(async () => {
    useDbBackupState.setState({
      tablesExportPhase: "exporting",
      tablesExportProgress: 0,
      tablesExportError: null,
    })

    try {
      const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
      const { fileName, exportFile } = await backupSDK.exportTables((done, total) => {
        useDbBackupState.setState({ tablesExportProgress: total > 0 ? done / total : 0 })
      })
      downloadExportFileRef.current(exportFile, fileName)
      useDbBackupState.setState({ tablesExportPhase: "done" })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      useDbBackupState.setState({ tablesExportPhase: "error", tablesExportError: message })
      toast.show("error", t("error"), message)
    }
  }, [t, toast])

  const startImportTables = useCallback(
    async (files: File[]) => {
      useDbBackupState.setState({
        tablesImportPhase: "importing",
        tablesImportProgress: 0,
        tablesImportLabel: "",
        tablesImportResult: null,
        tablesImportError: null,
      })

      try {
        const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
        const response = await backupSDK.importTables(files, (done, total, label) => {
          useDbBackupState.setState({
            tablesImportProgress: total > 0 ? done / total : 0,
            tablesImportLabel: label,
          })
        })
        useDbBackupState.setState({ tablesImportResult: response, tablesImportPhase: "done" })
        router.refresh()
        const hasUnresolvedImages = response.relink.unresolvedReferences > 0
        toast.show(
          hasUnresolvedImages ? "warning" : "success",
          t(hasUnresolvedImages ? "import_partial" : "import_success"),
          hasUnresolvedImages
            ? t("unresolved_result", {
                references: response.relink.unresolvedReferences,
                paths: response.relink.unresolvedPaths,
              })
            : "",
          4000,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useDbBackupState.setState({ tablesImportPhase: "error", tablesImportError: message })
        toast.show("error", t("error"), message)
      }
    },
    [router, t, toast],
  )
  const startImportTablesRef = useRef(startImportTables)
  useEffect(() => {
    startImportTablesRef.current = startImportTables
  })

  const startExportFiles = useCallback(async () => {
    useDbBackupState.setState({
      filesExportPhase: "exporting",
      filesExportBytesDone: 0,
      filesExportBytesTotal: 0,
      filesExportSpeedBytesPerMs: null,
      filesExportLabel: "",
      filesExportStartedAt: Date.now(),
      filesExportFinishedAt: null,
      filesExportError: null,
    })

    try {
      const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
      const { fileName, exportFile } = await backupSDK.exportFiles(progress => {
        useDbBackupState.setState({
          filesExportBytesDone: progress.bytesDone,
          filesExportBytesTotal: progress.bytesTotal,
          filesExportSpeedBytesPerMs: progress.speedBytesPerMs,
          filesExportLabel: progress.label,
        })
      }, "r2")
      downloadExportFileRef.current(exportFile, fileName)
      useDbBackupState.setState({ filesExportPhase: "done", filesExportFinishedAt: Date.now() })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      useDbBackupState.setState({ filesExportPhase: "error", filesExportError: message, filesExportFinishedAt: Date.now() })
      toast.show("error", t("error"), message)
    }
  }, [t, toast])

  const startImportFiles = useCallback(
    async (file: File) => {
      useDbBackupState.setState({
        filesImportPhase: "importing",
        filesImportBytesDone: 0,
        filesImportBytesTotal: 0,
        filesImportBytesSkipped: 0,
        filesImportSpeedBytesPerMs: null,
        filesImportLabel: "",
        filesImportStartedAt: Date.now(),
        filesImportFinishedAt: null,
        filesImportResult: null,
        filesImportError: null,
      })

      try {
        const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
        const response = await backupSDK.importFiles(file, progress => {
          useDbBackupState.setState({
            filesImportBytesDone: progress.bytesDone,
            filesImportBytesTotal: progress.bytesTotal,
            filesImportBytesSkipped: progress.bytesSkipped ?? 0,
            filesImportSpeedBytesPerMs: progress.speedBytesPerMs,
            filesImportLabel: progress.label,
          })
        }, "r2", { skipExisting: useDbBackupState.getState().filesImportSkipExisting })
        useDbBackupState.setState({ filesImportResult: response, filesImportPhase: "done", filesImportFinishedAt: Date.now() })
        router.refresh()
        const hasUnresolvedImages = response.relink !== null && response.relink.unresolvedReferences > 0
        const failedUploads = response.buckets.reduce((count, bucket) => count + bucket.failed, 0)
        toast.show(
          hasUnresolvedImages || failedUploads > 0 ? "warning" : "success",
          t(failedUploads > 0 ? "error" : hasUnresolvedImages ? "import_partial" : "import_success"),
          failedUploads > 0 ? t("files_failed_result", { count: failedUploads }) : hasUnresolvedImages && response.relink
            ? t("unresolved_result", {
                references: response.relink.unresolvedReferences,
                paths: response.relink.unresolvedPaths,
              })
            : "",
          4000,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        useDbBackupState.setState({ filesImportPhase: "error", filesImportError: message, filesImportFinishedAt: Date.now() })
        toast.show("error", t("error"), message)
      }
    },
    [router, t, toast],
  )
  const startImportFilesRef = useRef(startImportFiles)
  useEffect(() => {
    startImportFilesRef.current = startImportFiles
  })

  const handleTablesImportClick = useCallback(() => tablesInputRef.current?.click(), [])
  const handleFilesImportClick = useCallback(() => filesInputRef.current?.click(), [])

  const handleTablesFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) void startImportTablesRef.current(files)
    event.target.value = ""
  }, [])

  const handleFilesFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files?.length) void startImportFilesRef.current(files[0])
    event.target.value = ""
  }, [])

  const reset = useCallback(() => {
    useDbBackupState.getState().reset()
  }, [])

  return {
    isBusy: selectDbBackupIsBusy(backup),
    tablesInputRef,
    filesInputRef,
    tablesExportPhase: backup.tablesExportPhase,
    tablesExportProgress: backup.tablesExportProgress,
    tablesExportError: backup.tablesExportError,
    startExportTables,
    tablesImportPhase: backup.tablesImportPhase,
    tablesImportProgress: backup.tablesImportProgress,
    tablesImportLabel: backup.tablesImportLabel,
    tablesImportResult: backup.tablesImportResult,
    tablesImportError: backup.tablesImportError,
    handleTablesImportClick,
    handleTablesFileChange,
    filesExportPhase: backup.filesExportPhase,
    filesExportBytesDone: backup.filesExportBytesDone,
    filesExportBytesTotal: backup.filesExportBytesTotal,
    filesExportSpeedBytesPerMs: backup.filesExportSpeedBytesPerMs,
    filesExportLabel: backup.filesExportLabel,
    filesExportStartedAt: backup.filesExportStartedAt,
    filesExportFinishedAt: backup.filesExportFinishedAt,
    filesExportError: backup.filesExportError,
    startExportFiles,
    filesImportPhase: backup.filesImportPhase,
    filesImportBytesDone: backup.filesImportBytesDone,
    filesImportBytesTotal: backup.filesImportBytesTotal,
    filesImportBytesSkipped: backup.filesImportBytesSkipped,
    filesImportSkipExisting: backup.filesImportSkipExisting,
    setFilesImportSkipExisting: backup.setFilesImportSkipExisting,
    filesImportSpeedBytesPerMs: backup.filesImportSpeedBytesPerMs,
    filesImportLabel: backup.filesImportLabel,
    filesImportStartedAt: backup.filesImportStartedAt,
    filesImportFinishedAt: backup.filesImportFinishedAt,
    filesImportResult: backup.filesImportResult,
    filesImportError: backup.filesImportError,
    handleFilesImportClick,
    handleFilesFileChange,
    setModalOpen: backup.setModalOpen,
    reset,
  }
}
