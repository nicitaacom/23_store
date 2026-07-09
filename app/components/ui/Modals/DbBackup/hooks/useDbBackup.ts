"use client"

import { useCallback, useRef, useState } from "react"

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

  const downloadBlob = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportFn = useCallback(async () => {
    try {
      setIsExporting(true)
      setExportProgress(0)
      const date = new Date().toISOString().slice(0, 10)

      const { blobs, fileNames } = await backupSDK.exportBackup(setExportProgress)

      if (blobs.length === 1) {
        downloadBlob(blobs[0], `23_backup-${date}.tar.gz`)
      } else {
        for (let i = 0; i < blobs.length; i++) {
          downloadBlob(blobs[i], fileNames[i] ?? `23_backup-${date}-part${i + 1}.tar.gz`)
        }
        toast.show("success", t("export_split"), "", 4000)
      }
    } catch (error) {
      toast.show("error", t("error"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsExporting(false)
    }
  }, [downloadBlob, t, toast])

  const importFn = useCallback(
    async (files: File[]) => {
      try {
        setIsImporting(true)
        setImportProgress(0)
        setResults([])
        setBuckets([])
        const tableResults: API.BackupImportTableResult[] = []
        const bucketResults: API.BackupImportBucketResult[] = []
        for (let i = 0; i < files.length; i++) {
          const response = await backupSDK.importBackup(files[i], fraction =>
            setImportProgress((i + fraction) / files.length),
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

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      if (files.length > 0) void importFn(files)
      event.target.value = ""
    },
    [importFn],
  )

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
