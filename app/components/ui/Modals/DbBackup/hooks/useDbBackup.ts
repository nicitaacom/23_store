"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { backupSDK } from "@/sdk/BackupSDK/BackupSDK"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

export function useDbBackup() {
  const t = useScopedI18n("backup")
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0) // 0..1
  const [importProgress, setImportProgress] = useState(0) // 0..1
  const [results, setResults] = useState<API.BackupImportTableResult[]>([])
  const [buckets, setBuckets] = useState<API.BackupImportBucketResult[]>([])

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

  const exportFn = useCallback(async () => {
    try {
      setIsExporting(true)
      setExportProgress(0)
      const date = new Date().toISOString().slice(0, 10)

      const { archiveFiles, fileNames } = await backupSDK.exportBackup(setExportProgress)

      if (archiveFiles.length === 1) {
        downloadArchiveFileRef.current(archiveFiles[0], `23_backup-${date}.tar.gz`)
      } else {
        for (let index = 0; index < archiveFiles.length; index++) {
          downloadArchiveFileRef.current(archiveFiles[index], fileNames[index] ?? `23_backup-${date}-part${index + 1}.tar.gz`)
        }
        toast.show("success", t("export_split"), "", 4000)
      }
    } catch (error) {
      toast.show("error", t("error"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsExporting(false)
    }
  }, [t, toast])

  const importFn = useCallback(
    async (files: File[]) => {
      try {
        setIsImporting(true)
        setImportProgress(0)
        setResults([])
        setBuckets([])
        const tableResults: API.BackupImportTableResult[] = []
        const bucketResults: API.BackupImportBucketResult[] = []
        for (let index = 0; index < files.length; index++) {
          const response = await backupSDK.importBackup(files[index], fraction =>
            setImportProgress((index + fraction) / files.length),
          )
          if ("error" in response) throw new Error(response.error)
          tableResults.push(...response.results)
          bucketResults.push(...(response.buckets ?? []))
        }
        setResults(tableResults)
        setBuckets(bucketResults)
        toast.show("success", t("import_success"), "", 3000)
      } catch (error) {
        toast.show("error", t("error"), error instanceof Error ? error.message : String(error))
      } finally {
        setIsImporting(false)
      }
    },
    [t, toast],
  )

  const importFnRef = useRef(importFn)
  useEffect(() => {
    importFnRef.current = importFn
  })

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) void importFnRef.current(files)
    event.target.value = ""
  }, [])

  return {
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
  }
}
