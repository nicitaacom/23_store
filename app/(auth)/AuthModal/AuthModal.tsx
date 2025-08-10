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

export interface AuthFormData {
  username: string
  email: string
  password: string
}

export function AuthModal() {
  const router = useRouter()
  // const emailInputRef = useRef<HTMLInputElement>(null)
  const queryParams = useSearchParams()?.get("variant")

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

  useCloseModalIfAlreadyLoggedIn(queryParams as "login" | "recover" | "resetPassword")

  const onSubmit = async (data: AuthFormData) => {
    if (queryParams === "login") {
      await signInWithPassword(data.email, data.password, reset, router, displayResponseMessage)
    } else if (queryParams === "register") {
      await signUp(
        data.username,
        data.email,
        data.password,
        isEmailSent,
        setIsEmailSent,
        getValues,
        setResponseMessage,
        displayResponseMessage,
        setFocus,
      )
    } else if (queryParams === "recover") {
      router.refresh()
      await recoverPassword(data.email, getValues, displayResponseMessage)
      reset()
    } else if (queryParams === "resetPassword") {
      resetPassword(data.password, displayResponseMessage)
    }
  }

  return (
    <ModalQueryContainer
      className={twMerge(`w-[500px] transition-all duration-300`, modalHeightTailwind(queryParams, errors))}
      modalQuery="AuthModal">
      <div className="flex flex-col justify-center gap-y-2 w-[90%] mx-auto">
        <div
          className={twMerge(
            `flex flex-row gap-x-4 items-center w-full`,
            isAuthCompleted ? "justify-center" : "justify-start",
            (queryParams === "login" || queryParams === "register") && "mb-8",
            (errors.email || errors.password) && "!mb-4",
          )}>
          <AuthLogo isAuthCompleted={isAuthCompleted} isRecoverCompleted={isRecoverCompleted} />
          <AuthText queryParams={queryParams} />
        </div>

        {queryParams === "login" ||
        queryParams === "register" ||
        queryParams === "recover" ||
        queryParams === "resetPassword" ? (
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
            <p className="text-success text-center text-xl">Mission passed!</p>
            <p className="text-success text-center">respect+</p>
          </div>
        ) : queryParams === "recoverCompleted" && isRecoverCompleted === true ? (
          <div className="text-success flex flex-col justify-center gap-y-2 w-full h-[150px]">
            <p className="text-success text-center text-xl">Recover completed</p>
            <p className="text-success text-center">Stay safe!</p>
          </div>
        ) : (
          <h1 className="w-full h-[125px] flex justify-center items-center">
            Now change query params back to &variant=login :)
          </h1>
        )}
      </div>
    </ModalQueryContainer>
  )
}
