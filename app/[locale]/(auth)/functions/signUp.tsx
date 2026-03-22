import { Dispatch, ReactNode, SetStateAction } from "react"
import axios, { AxiosError } from "axios"

import { TAPIAuthRegister } from "@/api/auth/register/route"
import { AuthFormData } from "../AuthModal/AuthModal"
import { UseFormGetValues, UseFormSetFocus } from "react-hook-form"
import { Timer } from "../AuthModal/components"
import { Button } from "@/components/ui"
import { resendVerificationEmail } from "./resendVerificationEmail"
import { getPusherClient } from "@/libs/pusher"
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
  setResponseMessage: Dispatch<SetStateAction<ReactNode>>,
  displayResponseMessage: (message: React.ReactNode) => void,
  setFocus: UseFormSetFocus<AuthFormData>,
  locale: string,
) {
  try {
    const pusherClient = getPusherClient()

    const signUpResponse = await axios
      .post("/api/auth/register", {
        username: username,
        email: email,
        password: password,
      } as TAPIAuthRegister)
      .catch(error => {
        throw error
      })

    setIsEmailSent(true)
    if (getValues("email")) {
      // subscribe pusher to email channel to show message like 'auth completed'
      pusherClient.subscribe(getValues("email"))
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
    if (error instanceof AxiosError) {
      if (error.response?.data.error === "User exists - check your email\n You might not verified your email") {
        displayResponseMessage(<UserExistEmailNotConfirmed t={t} />)
      } else {
        displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
      }
    } else if (error instanceof Error) {
      displayResponseMessage(<p className="text-danger">{error.message}</p>)
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
