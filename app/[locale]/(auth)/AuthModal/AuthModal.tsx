"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { modalHeightTailwind } from "../modalHeightTailwind"
import { recoverPassword } from "../functions/recoverPassword"
import { resetPassword } from "../functions/resetPassword"
import { signInWithPassword } from "../functions/signInWithPassword"
import { signUp } from "../functions/signUp"
import { useAuthCompleted } from "../hooks/useAuthCompleted"
import { useCloseModalIfAlreadyLoggedIn } from "../hooks/useCloseModalIfAlreadyLoggedIn"
import { useHideResponseMessage } from "../hooks/useHideDisplayResponseMessage"
import { useRecoverCompleted } from "../hooks/useRecoverCompleted"
import { useResetResponseMessage } from "../hooks/useResetResponseMessage"
import { AuthForm } from "./components/AuthForm"
import { AuthLogo } from "./components/AuthLogo"
import { AuthText } from "./components/AuthText"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { ModalQueryContainer } from "@/components/ui/Modals/ModalContainers"

export interface IAuthFormData {
  username: string
  email: string
  password: string
}

export function AuthModal() {
  const router = useRouter()
  // const emailInputRef = useRef<HTMLInputElement>(null)
  const queryParams = useSearchParams()?.get("variant") ?? null
  const t = useI18n()
  const locale = useCurrentLocale()
  const authVariant = queryParams === "login" || queryParams === "recover" || queryParams === "resetPassword" ? queryParams : null

  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isAuthCompleted, setIsAuthCompleted] = useState(false)
  const [isRecoverCompleted, setIsRecoverCompleted] = useState(false)
  const [responseMessage, setResponseMessage] = useState<React.ReactNode | null>(null)

  //when user submit form and got response message from server
  function displayResponseMessage(message: React.ReactNode | null) {
    setResponseMessage(message)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setFocus,
    getValues,
  } = useForm<IAuthFormData>({ mode: "onBlur" })

  //for case when user click 'Forgot password?' or 'Create account' and some data in responseMessage
  useResetResponseMessage(setResponseMessage, queryParams)

  useHideResponseMessage(errors, displayResponseMessage)

  useAuthCompleted(isAuthCompleted, setIsAuthCompleted, getValues)

  useRecoverCompleted(isRecoverCompleted, setIsRecoverCompleted, getValues)

  useCloseModalIfAlreadyLoggedIn(authVariant)

  const onSubmit = async (data: IAuthFormData) => {
    if (queryParams === "login") {
      await signInWithPassword(data.email, data.password, reset, router, displayResponseMessage, t, locale)
    } else if (queryParams === "register") {
      await signUp(
        t,
        data.username,
        data.email,
        data.password,
        setIsEmailSent,
        getValues,
        setResponseMessage,
        displayResponseMessage,
        setFocus,
        locale,
      )
    } else if (queryParams === "recover") {
      router.refresh()
      await recoverPassword(data.email, getValues, displayResponseMessage, t, locale)
      reset()
    } else if (queryParams === "resetPassword") {
      resetPassword(data.password, displayResponseMessage, t)
    }
  }

  return (
    <ModalQueryContainer
      className={twMerge(
        "w-[calc(100vw-1.5rem)] mobile:w-[500px] rounded-3xl transition-all duration-300",
        modalHeightTailwind(queryParams, errors),
      )}
      closeButtonClassName="right-4 top-4 rounded-xl p-1"
      modalQuery="AuthModal">
      <div className="mx-auto flex w-full flex-col justify-center gap-y-4 px-6 pb-6 pt-6 mobile:px-8">
        <div
          className={twMerge(
            "flex w-full flex-row items-center gap-x-4 pr-12",
            isAuthCompleted ? "justify-center" : "justify-start",
            (queryParams === "login" || queryParams === "register") && "mb-4",
            (errors.email || errors.password) && "!mb-3",
          )}>
          <AuthLogo isAuthCompleted={isAuthCompleted} isRecoverCompleted={isRecoverCompleted} />
          <AuthText queryParams={queryParams} />
        </div>

        {queryParams === "login" || queryParams === "register" || queryParams === "recover" || queryParams === "resetPassword" ? (
          <AuthForm
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            queryParams={queryParams}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
            isEmailSent={isEmailSent}
            responseMessage={responseMessage}
          />
        ) : queryParams === "authCompleted" && isAuthCompleted === true ? (
          <div className="text-success flex flex-col justify-center w-full h-[150px]">
            <p className="text-success text-center text-xl">{t("auth.mission_passed")}</p>
            <p className="text-success text-center">{t("auth.respect_plus")}</p>
          </div>
        ) : queryParams === "recoverCompleted" && isRecoverCompleted === true ? (
          <div className="text-success flex flex-col justify-center gap-y-2 w-full h-[150px]">
            <p className="text-success text-center text-xl">{t("auth.recover.completed")}</p>
            <p className="text-success text-center">{t("auth.recover.stay_safe")}</p>
          </div>
        ) : (
          <h1 className="w-full h-[125px] flex justify-center items-center">
            {t("auth.change_query_params_back_to")} &variant=login :)
          </h1>
        )}
      </div>
    </ModalQueryContainer>
  )
}
