import { ReactNode } from "react"

import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import useUserStore from "@/store/user/userStore"
import { useResetEmailStore } from "@/store/user/useResetEmailStore"
import { Timer } from "../AuthModal/components"
import { Button } from "@/components/ui"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"

export async function resetPassword(password: string, displayResponseMessage: (message: ReactNode) => void, t: TI18nFunction) {
  const userStore = useUserStore.getState()

  try {
    // IMP - check in open and closed databases for this password (enterprice)
    const { email, clearEmail } = useResetEmailStore.getState()

    if (email && email.expires > new Date().getTime()) {
      const data = await accountSDK.resetPassword({ email: email.value, password })
      userStore.setUser((data.user as Parameters<typeof userStore.setUser>[0]) ?? null)
      clearEmail()
      displayResponseMessage(
        <div className="text-success flex flex-col justify-center items-center gap-1">
          {t("auth.recovery.passowrd_changed")}
          <Timer label={t("auth.page_close_in")} seconds={5} action={() => window.close()} />
        </div>,
      )
    } else {
      clearEmail()
      throw new Error(t("auth.recovery.session_expired"))
    }
  } catch (error) {
    if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
