import axios, { AxiosError } from "axios"
import { ReactNode } from "react"

import { TAPIAuthRecover } from "@/api/auth/recover/route"
import useUserStore from "@/store/user/userStore"
import { Timer } from "../AuthModal/components"
import { Button } from "@/components/ui"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"

export async function resetPassword(password: string, displayResponseMessage: (message: ReactNode) => void, t: TI18nFunction) {
  const userStore = useUserStore.getState()

  try {
    // IMP - check in open and closed databases for this password (enterprice)
    const email = localStorage.getItem("email")
    const parsedEmail = JSON.parse(email ?? "")

    if (parsedEmail.expires > new Date().getTime()) {
      const response = await axios.post("api/auth/reset", {
        email: parsedEmail.value,
        password: password,
      } as TAPIAuthRecover)

      userStore.setUser(response.data.user)

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
    //This is required to show custom error message (check api/dev_readme.md)
    if (error instanceof AxiosError) {
      displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
    } else if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
