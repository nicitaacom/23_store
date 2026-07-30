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
  filesExportError: string | null
  filesImportPhase: TFilesImportPhase
  filesImportBytesDone: number
  filesImportBytesTotal: number
  filesImportSpeedBytesPerMs: number | null
  filesImportLabel: string
  filesImportResult: TFilesImportResult | null
  filesImportError: string | null
}

type TDbBackupStore = TDbBackupState & {
  setModalOpen: (isModalOpen: boolean) => void
  reset: () => void
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
  filesExportError: null,
  filesImportPhase: "idle",
  filesImportBytesDone: 0,
  filesImportBytesTotal: 0,
  filesImportSpeedBytesPerMs: null,
  filesImportLabel: "",
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
  reset: () => set(state => ({ ...INITIAL_DB_BACKUP_STATE, isModalOpen: state.isModalOpen })),
}))
