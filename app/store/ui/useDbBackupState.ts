"use client"

import { create } from "zustand"

import type { TFilesImportResult, TTablesImportResult } from "@/sdk/BackupSDK/BackupSDK"

type TTablesExportPhase = "idle" | "exporting" | "done" | "error"
type TTablesImportPhase = "idle" | "importing" | "done" | "error"
type TFilesExportPhase = "idle" | "exporting" | "done" | "error"
type TFilesImportPhase = "idle" | "importing" | "done" | "error"

type TDbBackupState = {
  isModalOpen: boolean
  tablesExportPhase: TTablesExportPhase
  tablesExportProgress: number
  tablesExportError: string | null
  tablesImportPhase: TTablesImportPhase
  tablesImportProgress: number
  tablesImportLabel: string
  tablesImportResult: TTablesImportResult | null
  tablesImportError: string | null
  filesExportPhase: TFilesExportPhase
  filesExportBytesDone: number
  filesExportBytesTotal: number
  filesExportSpeedBytesPerMs: number | null
  filesExportLabel: string
  filesExportStartedAt: number | null
  filesExportFinishedAt: number | null
  filesExportError: string | null
  filesImportPhase: TFilesImportPhase
  filesImportBytesDone: number
  filesImportBytesTotal: number
  filesImportBytesSkipped: number
  filesImportSkipExisting: boolean
  filesImportSpeedBytesPerMs: number | null
  filesImportLabel: string
  filesImportStartedAt: number | null
  filesImportFinishedAt: number | null
  filesImportResult: TFilesImportResult | null
  filesImportError: string | null
}

type TDbBackupStore = TDbBackupState & {
  setModalOpen: (isModalOpen: boolean) => void
  reset: () => void
  setFilesImportSkipExisting: (skipExisting: boolean) => void
}

const INITIAL_DB_BACKUP_STATE: TDbBackupState = {
  isModalOpen: false,
  tablesExportPhase: "idle",
  tablesExportProgress: 0,
  tablesExportError: null,
  tablesImportPhase: "idle",
  tablesImportProgress: 0,
  tablesImportLabel: "",
  tablesImportResult: null,
  tablesImportError: null,
  filesExportPhase: "idle",
  filesExportBytesDone: 0,
  filesExportBytesTotal: 0,
  filesExportSpeedBytesPerMs: null,
  filesExportLabel: "",
  filesExportStartedAt: null,
  filesExportFinishedAt: null,
  filesExportError: null,
  filesImportPhase: "idle",
  filesImportBytesDone: 0,
  filesImportBytesTotal: 0,
  filesImportBytesSkipped: 0,
  filesImportSkipExisting: true,
  filesImportSpeedBytesPerMs: null,
  filesImportLabel: "",
  filesImportStartedAt: null,
  filesImportFinishedAt: null,
  filesImportResult: null,
  filesImportError: null,
}

export function selectDbBackupIsBusy(state: TDbBackupState) {
  return (
    state.tablesExportPhase === "exporting" ||
    state.tablesImportPhase === "importing" ||
    state.filesExportPhase === "exporting" ||
    state.filesImportPhase === "importing"
  )
}

export const useDbBackupState = create<TDbBackupStore>()(set => ({
  ...INITIAL_DB_BACKUP_STATE,
  setModalOpen: isModalOpen => set({ isModalOpen }),
  setFilesImportSkipExisting: filesImportSkipExisting => set({ filesImportSkipExisting }),
  reset: () => set(state => ({ ...INITIAL_DB_BACKUP_STATE, isModalOpen: state.isModalOpen })),
}))
