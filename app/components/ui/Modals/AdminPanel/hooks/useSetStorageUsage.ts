import { useCallback, useEffect, useRef, useState } from "react"

import { storageSDK } from "@/sdk/StorageSDK/StorageSDK"
import { useStorageUsage } from "@/store/admin/useStorageUsage"

export function useSetStorageUsage(enabled: boolean) {
  const [isSkeleton, setIsSkeleton] = useState(enabled)
  const refetchStorageUsage = useCallback(async () => {
    setIsSkeleton(true)
    useStorageUsage.getState().setLocalError(null)
    try { useStorageUsage.getState().setUsage(await storageSDK.usage()) }
    catch (error) { useStorageUsage.getState().setLocalError(error instanceof Error ? error.message : String(error)) }
    finally { setIsSkeleton(false) }
  }, [])
  const refreshRef = useRef(refetchStorageUsage)
  useEffect(() => { if (enabled) void refreshRef.current() }, [enabled])
  return { isSkeleton, refetchStorageUsage }
}
