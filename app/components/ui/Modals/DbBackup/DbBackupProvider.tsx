"use client"

import { createContext, useContext, type ReactNode } from "react"

import { useDbBackup } from "./hooks/useDbBackup"
import { DbBackupProgressCard } from "./DbBackupProgressCard"

type TDbBackupContext = ReturnType<typeof useDbBackup>

const DbBackupContext = createContext<TDbBackupContext | null>(null)

interface DbBackupProviderProps {
  children: ReactNode
  isModalOpen: boolean
}

// http://localhost:6006/?path=/story/admin-admintools--backup
export function DbBackupProvider({ children, isModalOpen }: DbBackupProviderProps) {
  const backup = useDbBackup()

  return (
    <DbBackupContext.Provider value={backup}>
      {children}
      <DbBackupProgressCard backup={backup} isModalOpen={isModalOpen} />
    </DbBackupContext.Provider>
  )
}

export function useDbBackupContext() {
  const backup = useContext(DbBackupContext)
  if (!backup) throw new Error("DbBackupProvider is required")
  return backup
}
