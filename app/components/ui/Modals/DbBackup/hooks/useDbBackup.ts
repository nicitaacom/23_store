"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import type { TTablesImportResult, TFilesImportResult } from "@/sdk/BackupSDK/BackupSDK"

type TTablesExportPhase = "idle" | "exporting" | "done" | "error"
type TTablesImportPhase = "idle" | "importing" | "done" | "error"
type TFilesExportPhase = "idle" | "exporting" | "done" | "error"
type TFilesImportPhase = "idle" | "importing" | "done" | "error"

export function useDbBackup() {
  const toast = useToast()
  const t = useScopedI18n("backup")

  const tablesInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  const [tablesExportPhase, setTablesExportPhase] = useState<TTablesExportPhase>("idle")
  const [tablesExportProgress, setTablesExportProgress] = useState(0) // 0..1
  const [tablesExportError, setTablesExportError] = useState<string | null>(null)

  const [tablesImportPhase, setTablesImportPhase] = useState<TTablesImportPhase>("idle")
  const [tablesImportProgress, setTablesImportProgress] = useState(0) // 0..1
  const [tablesImportLabel, setTablesImportLabel] = useState("")
  const [tablesImportResult, setTablesImportResult] = useState<TTablesImportResult | null>(null)
  const [tablesImportError, setTablesImportError] = useState<string | null>(null)

  const [filesExportPhase, setFilesExportPhase] = useState<TFilesExportPhase>("idle")
  const [filesExportBytesDone, setFilesExportBytesDone] = useState(0)
  const [filesExportBytesTotal, setFilesExportBytesTotal] = useState(0)
  const [filesExportSpeedBytesPerMs, setFilesExportSpeedBytesPerMs] = useState<number | null>(null)
  const [filesExportLabel, setFilesExportLabel] = useState("")
  const [filesExportError, setFilesExportError] = useState<string | null>(null)

  const [filesImportPhase, setFilesImportPhase] = useState<TFilesImportPhase>("idle")
  const [filesImportBytesDone, setFilesImportBytesDone] = useState(0)
  const [filesImportBytesTotal, setFilesImportBytesTotal] = useState(0)
  const [filesImportSpeedBytesPerMs, setFilesImportSpeedBytesPerMs] = useState<number | null>(null)
  const [filesImportLabel, setFilesImportLabel] = useState("")
  const [filesImportResult, setFilesImportResult] = useState<TFilesImportResult | null>(null)
  const [filesImportError, setFilesImportError] = useState<string | null>(null)

  const isBusy =
    tablesExportPhase === "exporting" ||
    tablesImportPhase === "importing" ||
    filesExportPhase === "exporting" ||
    filesImportPhase === "importing"

  useEffect(() => {
    if (!isBusy) return

    function preventPageClose(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", preventPageClose)
    return () => window.removeEventListener("beforeunload", preventPageClose)
  }, [isBusy])

  const downloadArchiveFile = useCallback((archiveFile: Blob, name: string) => {
    const url = URL.createObjectURL(archiveFile)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])
  const downloadArchiveFileRef = useRef(downloadArchiveFile)
  useEffect(() => {
    downloadArchiveFileRef.current = downloadArchiveFile
  })

  const startExportTables = useCallback(async () => {
    setTablesExportPhase("exporting")
    setTablesExportProgress(0)
    setTablesExportError(null)

    try {
      const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
      const { fileName, archiveFile } = await backupSDK.exportTables((done, total) => {
        setTablesExportProgress(total > 0 ? done / total : 0)
      })
      downloadArchiveFileRef.current(archiveFile, fileName)
      setTablesExportPhase("done")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setTablesExportPhase("error")
      setTablesExportError(message)
      toast.show("error", t("error"), message)
    }
  }, [t, toast])

  const startImportTables = useCallback(
    async (files: File[]) => {
      setTablesImportPhase("importing")
      setTablesImportProgress(0)
      setTablesImportLabel("")
      setTablesImportResult(null)
      setTablesImportError(null)

      try {
        const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
        const response = await backupSDK.importTables(files, (done, total, label) => {
          setTablesImportProgress(total > 0 ? done / total : 0)
          setTablesImportLabel(label)
        })
        setTablesImportResult(response)
        setTablesImportPhase("done")
        toast.show("success", t("import_success"), "", 3000)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setTablesImportPhase("error")
        setTablesImportError(message)
        toast.show("error", t("error"), message)
      }
    },
    [t, toast],
  )
  const startImportTablesRef = useRef(startImportTables)
  useEffect(() => {
    startImportTablesRef.current = startImportTables
  })

  const startExportFiles = useCallback(async () => {
    setFilesExportPhase("exporting")
    setFilesExportBytesDone(0)
    setFilesExportBytesTotal(0)
    setFilesExportSpeedBytesPerMs(null)
    setFilesExportLabel("")
    setFilesExportError(null)

    try {
      const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
      const { fileName, archiveFile } = await backupSDK.exportFiles(progress => {
        setFilesExportBytesDone(progress.bytesDone)
        setFilesExportBytesTotal(progress.bytesTotal)
        setFilesExportSpeedBytesPerMs(progress.speedBytesPerMs)
        setFilesExportLabel(progress.label)
      })
      downloadArchiveFileRef.current(archiveFile, fileName)
      setFilesExportPhase("done")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setFilesExportPhase("error")
      setFilesExportError(message)
      toast.show("error", t("error"), message)
    }
  }, [t, toast])

  const startImportFiles = useCallback(
    async (file: File) => {
      setFilesImportPhase("importing")
      setFilesImportBytesDone(0)
      setFilesImportBytesTotal(0)
      setFilesImportSpeedBytesPerMs(null)
      setFilesImportLabel("")
      setFilesImportResult(null)
      setFilesImportError(null)

      try {
        const { backupSDK } = await import("@/sdk/BackupSDK/BackupSDK")
        const response = await backupSDK.importFiles(file, progress => {
          setFilesImportBytesDone(progress.bytesDone)
          setFilesImportBytesTotal(progress.bytesTotal)
          setFilesImportSpeedBytesPerMs(progress.speedBytesPerMs)
          setFilesImportLabel(progress.label)
        })
        setFilesImportResult(response)
        setFilesImportPhase("done")
        toast.show("success", t("import_success"), "", 3000)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setFilesImportPhase("error")
        setFilesImportError(message)
        toast.show("error", t("error"), message)
      }
    },
    [t, toast],
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
    setTablesExportPhase("idle")
    setTablesExportProgress(0)
    setTablesExportError(null)
    setTablesImportPhase("idle")
    setTablesImportProgress(0)
    setTablesImportLabel("")
    setTablesImportResult(null)
    setTablesImportError(null)
    setFilesExportPhase("idle")
    setFilesExportBytesDone(0)
    setFilesExportBytesTotal(0)
    setFilesExportSpeedBytesPerMs(null)
    setFilesExportLabel("")
    setFilesExportError(null)
    setFilesImportPhase("idle")
    setFilesImportBytesDone(0)
    setFilesImportBytesTotal(0)
    setFilesImportSpeedBytesPerMs(null)
    setFilesImportLabel("")
    setFilesImportResult(null)
    setFilesImportError(null)
  }, [])

  return {
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
    reset,
  }
}
