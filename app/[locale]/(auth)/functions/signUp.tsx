import { Dispatch, ReactNode, SetStateAction } from "react"

import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import { AuthFormData } from "../AuthModal/AuthModal"
import { UseFormGetValues, UseFormSetFocus } from "react-hook-form"
import { Timer } from "../AuthModal/components"
import { Button } from "@/components/ui"
import { resendVerificationEmail } from "./resendVerificationEmail"
import { subscribePusherChannel } from "@/libs/pusher"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UserExistEmailNotConfirmed } from "./UserExistEmailNotConfirmed"
import { UnknownError } from "./UnknownError"

export async function signUp(
  t: TI18nFunction,
  username: string,
  email: string,
  password: string,

  setIsEmailSent: Dispatch<SetStateAction<boolean>>,
  getValues: UseFormGetValues<AuthFormData>,
  setResponseMessage: Dispatch<SetStateAction<ReactNode | null>>,
  displayResponseMessage: (message: React.ReactNode | null) => void,
  setFocus: UseFormSetFocus<AuthFormData>,
  locale: string,
) {
  try {
    await accountSDK.signUp({ username, email, password })

    setIsEmailSent(true)
    if (getValues("email")) {
      // subscribe pusher to email channel to show message like 'auth completed'
      subscribePusherChannel(getValues("email"))
    }
    setResponseMessage(<p className="text-success">{t("auth.register.email_confirmation_required")}</p>)
    setTimeout(() => {
      setResponseMessage(
        <div className="flex flex-col">
          <div className="flex flex-row">
            <p>{t("auth.dont_received_email_q")}&nbsp;</p>
            <Timer label={t("auth.resend_in")} seconds={20}>
              <Button
                type="button"
                variant="link"
                onClick={() => resendVerificationEmail(email, displayResponseMessage, setIsEmailSent, setFocus, t, locale)}>
                {t("auth.resend")}
              </Button>
            </Timer>
          </div>
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
        </div>,
      )
    }, 5000)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User exists - check your email\n You might not verified your email") {
        displayResponseMessage(<UserExistEmailNotConfirmed t={t} />)
      } else {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      }
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
