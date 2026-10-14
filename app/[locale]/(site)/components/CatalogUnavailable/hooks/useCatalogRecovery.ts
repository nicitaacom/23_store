import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

const RECOVERY_DELAYS_MS = [5000, 10000, 20000]

export function useCatalogRecovery(autoRecover: boolean) {
  const router = useRouter()
  const [recoveryAttempt, setRecoveryAttempt] = useState(0)
  const [isPending, startTransition] = useTransition()
  const isRecovering = autoRecover && recoveryAttempt < RECOVERY_DELAYS_MS.length

  useEffect(() => {
    if (!isRecovering || isPending) return

    const timer = setTimeout(() => {
      setRecoveryAttempt(attempt => attempt + 1)
      startTransition(() => router.refresh())
    }, RECOVERY_DELAYS_MS[recoveryAttempt])

    return () => clearTimeout(timer)
  }, [isRecovering, isPending, recoveryAttempt, router])

  function handleRefreshCatalog() {
    setRecoveryAttempt(0)
    startTransition(() => router.refresh())
  }

  return { handleRefreshCatalog, isPending, isRecovering }
}
