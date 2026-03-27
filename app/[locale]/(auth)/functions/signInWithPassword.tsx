import axios, { AxiosError } from "axios"
import { UseFormReset } from "react-hook-form"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import supabaseClient from "@/libs/supabase/supabaseClient"

import { TAPIAuthLogin } from "@/api/auth/login/route"
import useUserStore from "@/store/user/userStore"
import { Button } from "@/components/ui"
import { Timer } from "../AuthModal/components"
import { AuthFormData } from "../AuthModal/AuthModal"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { UnknownError } from "./UnknownError"
import { UserExistEmailNotConfirmed } from "./UserExistEmailNotConfirmed"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"

export async function signInWithPassword(
  email: string,
  password: string,
  reset: UseFormReset<AuthFormData>,
  router: AppRouterInstance,
  displayResponseMessage: (message: React.ReactNode) => void,
  t: TI18nFunction,
  locale: string,
) {
  const userStore = useUserStore.getState()

  try {
    // Check is user with this email doesn't exist and return providers and username
    const response = await axios.post("/api/auth/login", { email: email } as TAPIAuthLogin)
    const { data: user, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    })

    // Check if user with this email already exists (if user first time auth with OAuth)
    // Throw error if user with this email exist with oauth providers (only) - or wrong email/password
    if (signInError) {
      const isCredentialsProvider = response.data.providers?.includes("credentials")
      const isOnlyGoogleProvider =
        Array.isArray(response.data.providers) && response.data.providers.length === 1 && response.data.providers[0] === "google"
      const providersLabel = Array.isArray(response.data.providers) ? response.data.providers.join(", ") : ""
      throw new Error(
        isCredentialsProvider
          ? t("auth.database.invalid_credentials")
          : isOnlyGoogleProvider
            ? t("auth.account.exist_google")
            : t("auth.account.exist", { provider: providersLabel }),
      )
    }

    if (user.user) {
      userStore.setUser(user.user)
      reset()
      router.refresh() //refresh to show avatarUrl in navbar

      displayResponseMessage(
        <div className="flex flex-col items-center justify-center gap-1 text-success">
          <p>{t("auth.auth.completed")}</p>
          <Timer label={t("auth.page_close_in")} seconds={5} action={() => router.replace(`/${locale}`)} />
        </div>,
      )
    } else {
      displayResponseMessage(
        <div className="text-danger flex flex-row">
          <p>{t("auth.no_user_or_username")}&nbsp;</p>
          <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
            {t("auth.here")}
          </Button>
        </div>,
      )
      return
    }
  } catch (error) {
    if (error instanceof Error && error.message === t("auth.database.invalid_credentials")) {
      displayResponseMessage(<p className="text-danger">{t("auth.database.invalid_credentials")}</p>)
    } else if (error instanceof AxiosError) {
      if (error.response?.data.error === "User exists - check your email\n You might not verified your email") {
        displayResponseMessage(<UserExistEmailNotConfirmed t={t} />)
      } else {
        displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
      }
    } else if (error instanceof Error) {
      if (error.message === t("auth.account.exist_google")) {
        displayResponseMessage(
          <div className="flex flex-col justify-center items-center">
            <p className="text-danger">{t("auth.account.exist_google")}</p>
            <Button
              variant="link"
              onClick={async () =>
                await supabaseClient.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${getAuthCallbackBaseUrl()}/${locale}/auth/callback/oauth?provider=google` },
                })
              }>
              {t("auth.continue_with_google")}
            </Button>
          </div>,
        )
      } else {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      }
    } else {
      displayResponseMessage(<UnknownError t={t} />)
    }
  }
}
