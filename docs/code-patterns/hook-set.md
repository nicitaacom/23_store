### hook-set

```ts
import { useCallback, useEffect, useState } from "react"

import useToast from "@/store/useToast"
import useAccountsStore from "@/store/useAccountsStore"
import { EmailsSDK } from "@/classes/Emails/EmailsSDK"
import { useEnvs } from "@/store/useEnvs"
import { useMailboxes } from "../../../stores/useMailboxes"

export const useSetMailboxes = () => {
  const toast = useToast()
  const { userId } = useAccountsStore()
  const emailsSDK = new EmailsSDK()

  const [isSkeleton, setIsSkeleton] = useState(false)

  const { encryptedEnvsClient } = useEnvs()
  const { setMailboxes } = useMailboxes()

  const refetchMailboxes = useCallback(async () => {
    try {
      setIsSkeleton(true)
      const response = await emailsSDK.getSESMailboxes(encryptedEnvsClient)
      if (typeof response === "string") return toast.show("error", "", response)
      setMailboxes(response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.show("error", "Failed to fetch mailboxes", errorMessage)
    } finally {
      setIsSkeleton(false)
    }
  }, [userId])

  useEffect(() => {
    refetchMailboxes()
  }, []) // do it once - then only if user click "refetch" button

  return { isSkeleton, refetchMailboxes }
}
```
