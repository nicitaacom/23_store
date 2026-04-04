import { ReactNode } from "react"

import { TAPIAuthRecover } from "@/api/auth/recover/route"
import useUserStore from "@/store/user/userStore"
import { Timer } from "../AuthModal/components"
import { Button } from "@/components/ui"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export async function resetPassword(password: string, displayResponseMessage: (message: ReactNode) => void, t: TI18nFunction) {
  const userStore = useUserStore.getState()

  try {
    // IMP - check in open and closed databases for this password (enterprice)
    const email = localStorage.getItem("email")
    const parsedEmail = JSON.parse(email ?? "")

    if (parsedEmail.expires > new Date().getTime()) {
      const response = await fetch("api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsedEmail.value,
          password: password,
        } as TAPIAuthRecover),
      })

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response))
      }

      const data = await response.json()

      userStore.setUser(data.user)

      localStorage.removeItem("email") // Remove email from localstorage
      displayResponseMessage(
        <div className="text-success flex flex-col justify-center items-center gap-1">
          {t("auth.recovery.passowrd_changed")}
          <Timer label={t("auth.page_close_in")} seconds={5} action={() => window.close()} />
        </div>,
      )
    } else {
      localStorage.removeItem("email") // Remove expired data
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
