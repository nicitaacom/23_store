"use client"

import { createContext, useContext, useEffect } from "react"

interface AdminPanelDirtyContextValue {
  setSectionDirty: (section: string, isDirty: boolean) => void
}

const AdminPanelDirtyContext = createContext<AdminPanelDirtyContextValue | null>(null)

export const AdminPanelDirtyProvider = AdminPanelDirtyContext.Provider

export function useAdminPanelDirty(section: string, isDirty: boolean) {
  const context = useContext(AdminPanelDirtyContext)

  useEffect(() => {
    context?.setSectionDirty(section, isDirty)

    return () => context?.setSectionDirty(section, false)
  }, [context, isDirty, section])
}
