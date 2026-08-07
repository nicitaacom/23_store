"use client"

import { createContext, useContext, useEffect } from "react"

interface AdminPanelChangedContextValue {
  setSectionHasChanges: (section: string, hasChanges: boolean) => void
}

const AdminPanelChangedContext = createContext<AdminPanelChangedContextValue | null>(null)

export const AdminPanelChangedProvider = AdminPanelChangedContext.Provider

export function useAdminPanelChanged(section: string, hasChanges: boolean) {
  const context = useContext(AdminPanelChangedContext)

  useEffect(() => {
    context?.setSectionHasChanges(section, hasChanges)

    return () => context?.setSectionHasChanges(section, false)
  }, [context, hasChanges, section])
}
