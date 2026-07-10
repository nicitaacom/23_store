import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { UseFormReset } from "react-hook-form"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { IAuthFormData } from "../AuthModal/AuthModal"
import { Timer } from "../AuthModal/components"
import { UnknownError } from "./UnknownError"
import { UserExistEmailNotConfirmed } from "./UserExistEmailNotConfirmed"
import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import { getAuthCallbackBaseUrl } from "@/utils/getAuthCallbackBaseUrl"
import supabaseClient from "@/libs/supabase/supabaseClient"
import useUserStore from "@/store/user/userStore"
import { Button } from "@/components/ui"

export async function signInWithPassword(
  email: string,
  password: string,
  reset: UseFormReset<IAuthFormData>,
  router: AppRouterInstance,
  displayResponseMessage: (message: React.ReactNode) => void,
  t: TI18nFunction,
  locale: string,
) {
  const userStore = useUserStore.getState()

  try {
    // Check is user with this email doesn't exist and return providers and username
    const existingUserData = await accountSDK.signInWithEmail(email)
    const { data: user, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    })

    // Check if user with this email already exists (if user first time auth with OAuth)
    // Throw error if user with this email exist with oauth providers (only) - or wrong email/password
    if (signInError) {
      const isCredentialsProvider = existingUserData.providers?.includes("credentials")
      const isOnlyGoogleProvider =
        Array.isArray(existingUserData.providers) &&
        existingUserData.providers.length === 1 &&
        existingUserData.providers[0] === "google"
      const providersLabel = Array.isArray(existingUserData.providers) ? existingUserData.providers.join(", ") : ""
      throw new Error(
        isCredentialsProvider
          ? t("auth.database.invalid_credentials")
          : isOnlyGoogleProvider
            ? t("auth.account.exist_google")
            : t("auth.account.exist", { provider: providersLabel }),
      )
    }

    if (user.user) {
      const syncPublicUserResponse = await fetch("/api/auth/sync-public-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: "credentials" }),
      })

      if (!syncPublicUserResponse.ok) {
        const syncPublicUserPayload = (await syncPublicUserResponse.json().catch(() => null)) as { error?: string } | null
        throw new Error(syncPublicUserPayload?.error || "Failed to sync public user")
      }

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
          <Button className="text-info" href={process.env.NEXT_PUBLIC_TELEGRAM_URL} variant="link">
            {t("auth.here")}
          </Button>
        </div>,
      )
      return
    }
  } catch (error) {
    if (error instanceof Error && error.message === t("auth.database.invalid_credentials")) {
      displayResponseMessage(<p className="text-danger">{t("auth.database.invalid_credentials")}</p>)
    } else if (error instanceof Error) {
      if (error.message === "User exists - check your email\n You might not verified your email") {
        displayResponseMessage(<UserExistEmailNotConfirmed t={t} />)
      } else if (error.message === t("auth.account.exist_google")) {
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
