"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"

import { ModalQueryContainer } from "@/components/ui/Modals/ModalContainers"
import { signUp } from "../functions/signUp"
import { resetPassword } from "../functions/resetPassword"
import { recoverPassword } from "../functions/recoverPassword"
import { signInWithPassword } from "../functions/signInWithPassword"
import { useResetResponseMessage } from "../hooks/useResetResponseMessage"
import { useHideResponseMessage } from "../hooks/useHideDisplayResponseMessage"
import { useAuthCompleted } from "../hooks/useAuthCompleted"
import { useRecoverCompleted } from "../hooks/useRecoverCompleted"
import { modalHeightTailwind } from "../modalHeightTailwind"
import { AuthLogo } from "./components/AuthLogo"
import { AuthText } from "./components/AuthText"
import { AuthForm } from "./components/AuthForm"
import { useCloseModalIfAlreadyLoggedIn } from "../hooks/useCloseModalIfAlreadyLoggedIn"
import { useCurrentLocale, useI18n } from "@/locales/client"

export interface AuthFormData {
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
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)

  //when user submit form and got response message from server
  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setFocus,
    getValues,
  } = useForm<AuthFormData>({ mode: "onBlur" })

  //for case when user click 'Forgot password?' or 'Create account' and some data in responseMessage
  useResetResponseMessage(setResponseMessage, queryParams)

  useHideResponseMessage(errors, displayResponseMessage)

  useAuthCompleted(isAuthCompleted, setIsAuthCompleted, getValues)

  useRecoverCompleted(isRecoverCompleted, setIsRecoverCompleted, getValues)

  useCloseModalIfAlreadyLoggedIn(authVariant)

  const onSubmit = async (data: AuthFormData) => {
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
      className={twMerge(`w-[500px] rounded-[18px] transition-all duration-300`, modalHeightTailwind(queryParams, errors))}
      closeButtonClassName="right-3 top-3 rounded-[10px] p-[3px]"
      modalQuery="AuthModal">
      <div className="flex flex-col justify-center gap-y-3 w-[88%] mx-auto pt-5 pb-4">
        <div
          className={twMerge(
            `flex flex-row gap-x-3 items-center w-full pr-12`,
            isAuthCompleted ? "justify-center" : "justify-start",
            (queryParams === "login" || queryParams === "register") && "mb-5",
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
