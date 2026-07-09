import { Dispatch, SetStateAction } from "react"
import { UseFormSetFocus } from "react-hook-form"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { AuthFormData } from "../AuthModal/AuthModal"
import { UnknownError } from "./UnknownError"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { Button } from "@/components/ui"

export async function resendVerificationEmail(
  email: string,
  displayResponseMessage: (message: React.ReactNode | null) => void,
  setIsEmailSent: Dispatch<SetStateAction<boolean>>,
  setFocus: UseFormSetFocus<AuthFormData>,
  t: TI18nFunction,
  locale: string,
) {
  try {
    const { error: resendError } = await supabaseClient.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo: `${getAuthCallbackBaseUrl()}/${locale}/auth/callback/credentials`,
      },
    })
    if (resendError) throw resendError

    displayResponseMessage(
      <div className="flex flex-col">
        <div className="text-success flex flex-row justify-center">
          <p>{t("auth.resent")} -&nbsp;</p>
          <Button
            className="text-brand"
            variant="link"
            type="button"
            onClick={() => {
              setIsEmailSent(false)
              setTimeout(() => {
                setFocus("email")
              }, 50)
            }}>
            {t("auth.recovery.change_email")}
          </Button>
        </div>
        <p>{t("auth.check_spam")}</p>
      </div>,
    )
  } catch (error) {
    if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
