import { ReactNode } from "react"
import { UseFormGetValues } from "react-hook-form"

import { IAuthFormData } from "@/ts/interfaces/IAuthFormData"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"
import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"
import { subscribePusherChannel } from "@/libs/pusher"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { useResetEmailStore } from "@/store/user/useResetEmailStore"

export async function recoverPassword(
  email: string,
  getValues: UseFormGetValues<IAuthFormData>,
  displayResponseMessage: (message: ReactNode) => void,
  t: TI18nFunction,
  locale: string,
) {
  try {
    await accountSDK.recoverPassword(email)

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAuthCallbackBaseUrl()}/${locale}/auth/callback/recover`,
    })
    if (error) throw Error(error.message)

    // subscribe pusher to email channel to show message like 'password recovered - stay safe'
    if (getValues("email")) {
      subscribePusherChannel(getValues("email"))
    }

    useResetEmailStore.getState().setEmail({ value: email, expires: new Date().getTime() + 5 * 60 * 1000 })

    displayResponseMessage(<p className="text-success">{t("auth.database.reset_email_sent")}</p>)
  } catch (error) {
    if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
