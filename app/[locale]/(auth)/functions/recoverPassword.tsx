import { ReactNode } from "react"
import { UseFormGetValues } from "react-hook-form"

import { TAPIAuthRecover } from "@/api/auth/recover/route"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { AuthFormData } from "../AuthModal/AuthModal"
import { Button } from "@/components/ui"
import { getPusherClient } from "@/libs/pusher"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"
import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"

export async function recoverPassword(
  email: string,
  getValues: UseFormGetValues<AuthFormData>,
  displayResponseMessage: (message: ReactNode) => void,
  t: TI18nFunction,
  locale: string,
) {
  try {
    const pusherClient = getPusherClient()

    const response = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email } as TAPIAuthRecover),
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAuthCallbackBaseUrl()}/${locale}/auth/callback/recover`,
    })
    if (error) throw Error(error.message)

    // subscribe pusher to email channel to show message like 'password recovered - stay safe'
    if (getValues("email")) {
      pusherClient.subscribe(getValues("email"))
    }

    // Save email in localstorage to trigger pusher for this channel (api/auth/recover) (expires in 5 min)
    localStorage.setItem("email", JSON.stringify({ value: email, expires: new Date().getTime() + 5 * 60 * 1000 }))

    displayResponseMessage(<p className="text-success">{t("auth.database.reset_email_sent")}</p>)
  } catch (error) {
    if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
