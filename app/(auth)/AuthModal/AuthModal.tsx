"use client"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePathname, useSearchParams } from "next/navigation"

import { useForm } from "react-hook-form"
import { AiOutlineUser, AiOutlineMail, AiOutlineLock } from "react-icons/ai"
import supabaseClient from "@/libs/supabaseClient"
import axios, { AxiosError } from "axios"
import { twMerge } from "tailwind-merge"
import { pusherClient } from "@/libs/pusher"

import { TAPIAuthRegister } from "@/api/auth/register/route"
import { TAPIAuthRecover } from "../../api/auth/recover/route"
import { TAPIAuthLogin } from "@/api/auth/login/route"
import { getCookie } from "@/utils/helpersCSR"
import useDarkMode from "@/store/ui/darkModeStore"
import { FormInput } from "../../components/ui/Inputs/Validation/FormInput"
import { Button, Checkbox } from "../../components/ui"
import ContinueWithButton from "@/(auth)/components/ContinueWithButton"
import { Timer } from "@/(auth)/components"
import { ModalQueryContainer } from "@/components/ui/Modals/ModalContainers"

interface AdminModalProps {
  label: string
}

interface FormData {
  username: string
  email: string
  password: string
}

export function AuthModal({ label }: AdminModalProps) {
  const router = useRouter()
  // const emailInputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const queryParams = useSearchParams().get("variant")
  const darkMode = useDarkMode()

  const [isChecked, setIsChecked] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isAuthCompleted, setIsAuthCompleted] = useState(false)
  const [isRecoverCompleted, setIsRecoverCompleted] = useState(false)
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)

  //for case when user click 'Forgot password?' or 'Create account' and some data in responseMessage
  useEffect(() => {
    setResponseMessage(<p></p>)
  }, [queryParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    trigger,
    getValues,
  } = useForm<FormData>()

  //when user submit form and got response message from server
  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
  }

  useEffect(() => {
    if (isAuthCompleted) router.push("?modal=AuthModal&variant=authCompleted")
    // else router.push("?modal=AuthModal&variant=login")
  }, [isAuthCompleted, router])

  // Show 'Auth completed' message if user verified email
  useEffect(() => {
    function authCompletedHandler() {
      setIsAuthCompleted(true)
    }

    pusherClient.bind("auth:completed", authCompletedHandler)
    return () => {
      if (getValues("email")) {
        pusherClient.unsubscribe(getValues("email"))
      }
      pusherClient.unbind("auth:completed", authCompletedHandler)
    }
  }, [getValues])

  // Show 'Recover completed' if user changed password in another window
  useEffect(() => {
    if (isRecoverCompleted) router.push("?modal=AuthModal&variant=recoverCompleted")

    function recoverCompletedHandler() {
      setIsRecoverCompleted(true)
    }
    pusherClient.bind("recover:completed", recoverCompletedHandler)
    return () => {
      if (getValues("email")) {
        pusherClient.unsubscribe(getValues("email"))
      }
      pusherClient.unbind("recover:completed", recoverCompletedHandler)
    }
  }, [getValues, isRecoverCompleted, router])

  async function signInWithPassword(email: string, password: string) {
    //Check user wants login with email or username
    try {
      const response = await axios.post("/api/auth/login", { email: email } as TAPIAuthLogin)

      const { data: user, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      })
      // Check if user with this email already exists (if user first time auth with OAuth)
      // Throw error if user exist with oauth provider
      if (signInError) {
        const isCredentialsProvider = response.data.providers?.includes("credentials")
        const isOnlyGoogleProvider =
          Array.isArray(response.data.providers) &&
          response.data.providers.length === 1 &&
          response.data.providers[0] === "google"
        throw new Error(
          isCredentialsProvider
            ? `Wrong email or password`
            : isOnlyGoogleProvider
            ? "You already have account with google"
            : `You already have an account with ${response.data.providers}`,
        )
      }

      if (user.user) {
        //store info somewhere (e.g in localStorage with zustand)
        reset()

        displayResponseMessage(
          <div className="text-success flex flex-col justify-center items-center">
            You are logged in - you may close this modal
            <Timer label="I close this modal in" seconds={5} action={() => router.replace("/")} />
          </div>,
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid login credentials") {
        displayResponseMessage(<p className="text-danger">Wrong email or password</p>)
      } else if (error instanceof AxiosError) {
        displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
      } else if (error instanceof Error) {
        if (error.message === "You already have account with google") {
          displayResponseMessage(
            <div className="flex flex-col justify-center items-center">
              <p className="text-danger">You already have account with google</p>
              <Button
                variant="link"
                onClick={async () =>
                  await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${location.origin}/auth/callback/oauth?provider=google` },
                  })
                }>
                continue with google?
              </Button>
            </div>,
          )
        } else displayResponseMessage(<p className="text-danger">{error.message}</p>)
      } else {
        displayResponseMessage(
          <div className="text-danger flex flex-row">
            <p>An unknown error occurred - contact admin&nbsp;</p>
            <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
              here
            </Button>
          </div>,
        )
      }
    }
  }

  async function signUp(username: string, email: string, password: string) {
    try {
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
        pusherClient.subscribe(getValues("email"))
      }
      setResponseMessage(<p className="text-success">Check your email</p>)
      setTimeout(() => {
        setResponseMessage(
          <div className="flex flex-row">
            Don&apos;t revice email?&nbsp;
            <Timer label="resend in" seconds={20}>
              <Button type="button" variant="link" onClick={() => resendVerificationEmail(email)}>
                resend
              </Button>
            </Timer>
          </div>,
        )
      }, 5000)
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data.error === "User exists - check your email\n You might not verified your email") {
          displayResponseMessage(
            <div className="flex flex-col justify-center items-center">
              <p className="text-danger">User exists - check your email</p>
              <p className="text-danger">You might not verified your email</p>
            </div>,
          )
        } else {
          displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
        }
      } else if (error instanceof Error) {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      } else {
        displayResponseMessage(
          <div className="text-danger flex flex-row">
            <p>An unknown error occurred - contact admin&nbsp;</p>
            <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
              here
            </Button>
          </div>,
        )
      }
    }
  }

  async function resendVerificationEmail(email: string) {
    try {
      const { error: resendError } = await supabaseClient.auth.resend({
        type: "signup",
        email: email,
      })
      if (resendError) throw resendError

      displayResponseMessage(
        <div className="flex flex-col">
          <div className="text-success flex flex-row justify-center">
            <p>Email resended -&nbsp;</p>
            <Button
              className="text-brand"
              variant="link"
              type="button"
              onClick={() => {
                setIsEmailSent(false)
                setTimeout(() => {
                  // TODO - fix because it doesn't set input.focus()
                  trigger("email", { shouldFocus: true })
                }, 50)
              }}>
              change email
            </Button>
          </div>
          <p>If you don&apos;t recieve an email - check &apos;Spam&apos; and &apos;All mail&apos;</p>
        </div>,
      )
    } catch (error) {
      if (error instanceof Error) {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      } else {
        displayResponseMessage(
          <div className="text-danger flex flex-row">
            <p>An unknown error occurred - contact admin&nbsp;</p>
            <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
              here
            </Button>
          </div>,
        )
      }
    }
  }

  async function recoverPassword(email: string) {
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/recover`,
      })
      if (error) throw error

      if (getValues("email")) {
        pusherClient.subscribe(getValues("email"))
      }

      displayResponseMessage(<p className="text-success">Check your email</p>)
    } catch (error) {
      if (error instanceof Error) {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      } else {
        displayResponseMessage(
          <div className="text-danger flex flex-row">
            <p>An unknown error occurred - contact admin&nbsp;</p>
            <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
              here
            </Button>
          </div>,
        )
      }
    }
  }

  async function resetPassword(password: string) {
    try {
      // IMP - check in open and closed databases for this password (enterprice)
      const response = await axios.post("api/auth/recover", {
        email: getCookie("email"),
        password: password,
      } as TAPIAuthRecover)

      //TODO - set response.data in store (userStore.setUser()) - and set data from response

      displayResponseMessage(
        <div className="text-success flex flex-col justify-center items-center">
          Your password changed - you may close this window
          <Timer label="I close this modal in" seconds={7} action={() => router.replace("/")} />
        </div>,
      )
    } catch (error) {
      //This is required to show custom error message (check api/dev_readme.md)
      if (error instanceof AxiosError) {
        displayResponseMessage(<p className="text-danger">{error.response?.data.error}</p>)
      } else if (error instanceof Error) {
        displayResponseMessage(<p className="text-danger">{error.message}</p>)
      } else {
        displayResponseMessage(
          <div className="text-danger flex flex-row">
            <p>An unknown error occurred - contact admin&nbsp;</p>
            <Button className="text-info" href="https://t.me/nicitaacom" variant="link">
              here
            </Button>
          </div>,
        )
      }
    }
  }

  const onSubmit = async (data: FormData) => {
    if (queryParams === "login") {
      await signInWithPassword(data.email, data.password)
    } else if (queryParams === "register") {
      await signUp(data.username, data.email, data.password)
      // reset()
    } else if (queryParams === "recover") {
      router.refresh()
      await recoverPassword(data.email)
      reset()
    } else if (queryParams === "resetPassword") {
      resetPassword(data.password)
    }
  }

  return (
    <ModalQueryContainer
      className={twMerge(
        `w-[500px] transition-all duration-300`,
        queryParams === "login" ? "h-[585px]" : queryParams === "register" ? "h-[670px]" : "h-[350px]",

        //for login height when errors
        queryParams === "login" && errors.password && "!h-[610px]",

        //for register height when errors
        queryParams === "register" && (errors.email || errors.password) && "!h-[720px]",

        //for recover height when errors
        queryParams === "recover" && errors.email && "!h-[380px]",

        //for resetPassword height when errors
        queryParams === "resetPassword" && errors.password && "!h-[390px]",

        //for auth completed height
        queryParams === "authCompleted" && "!h-[250px]",
      )}
      modalQuery="AuthModal">
      <div className="flex flex-col justify-center gap-y-2 w-[90%] mx-auto">
        <div className="flex flex-row gap-x-4 items-center h-[100px]">
          <Image
            className="w-[40px] h-[57px]"
            src={darkMode.isDarkMode ? "/logo-dark.png" : "/logo-light.png"}
            alt="logo"
            width={40}
            height={57}
          />
          <h1 className="text-4xl font-bold">
            {queryParams === "login"
              ? "Login"
              : queryParams === "register"
              ? "Register"
              : queryParams === "recover"
              ? "Recover"
              : queryParams === "resetPassword"
              ? "Reset pasword"
              : "Auth completed"}
          </h1>
        </div>

        {queryParams === "login" ||
        queryParams === "register" ||
        queryParams === "recover" ||
        queryParams === "resetPassword" ? (
          <>
            <form
              className="relative max-w-[450px] w-[75vw] flex flex-col gap-y-2 mb-4"
              onSubmit={handleSubmit(onSubmit)}>
              {queryParams !== "resetPassword" && (
                <FormInput
                  endIcon={<AiOutlineMail size={24} />}
                  register={register}
                  errors={errors}
                  id="email"
                  label="Email"
                  placeholder="user@big.com"
                  disabled={isSubmitting || isEmailSent}
                  required
                />
              )}
              {queryParams !== "recover" && (
                <FormInput
                  endIcon={<AiOutlineLock size={24} />}
                  register={register}
                  errors={errors}
                  id="password"
                  label="Password"
                  type="password"
                  placeholder={
                    queryParams === "register" || queryParams === "resetPassword"
                      ? "NeW-RaNd0m_PasWorD"
                      : "RaNd0m_PasWorD"
                  }
                  disabled={isSubmitting || isEmailSent}
                  required
                />
              )}
              {queryParams === "register" && (
                <FormInput
                  endIcon={<AiOutlineUser size={24} />}
                  register={register}
                  errors={errors}
                  id="username"
                  label="Username"
                  placeholder="HANTARESpeek"
                  disabled={isSubmitting || isEmailSent}
                  required
                />
              )}
              {/* LOGIN-BODY-HELP */}
              <div className="flex justify-between mb-2">
                <div className={twMerge(`invisible`, queryParams === "login" && "visible")}>
                  {/* 'Remember me' now checkbox do nothing - expected !isChecked 1m jwt - isChecked 3m jwt */}
                  <Checkbox
                    className="bg-background cursor-pointer"
                    label="Remember me"
                    onChange={() => setIsChecked(isChecked => !isChecked)}
                    disabled={isSubmitting}
                    isChecked={isChecked}
                  />
                </div>
                {queryParams !== "register" && (
                  <Button
                    href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "recover" : "login"}`}
                    variant="link">
                    {queryParams === "login" ? "Forgot password?" : "Remember password?"}
                  </Button>
                )}
              </div>

              <Button variant="default-outline" disabled={isSubmitting || isEmailSent}>
                {queryParams === "login"
                  ? "Login"
                  : queryParams === "register"
                  ? "Register"
                  : queryParams === "recover" || queryParams === "resetPassword"
                  ? "Reset password"
                  : "Send email"}
              </Button>
              <div className="flex justify-center text-center">{responseMessage}</div>
            </form>

            {/* CONTINUE WITH (for login and register only) */}
            {(queryParams === "login" || queryParams === "register") && (
              <section className="flex flex-col gap-y-4 text-center">
                <p>or continue with</p>
                <div
                  className={`grid grid-cols-3 gap-x-2 ${
                    isSubmitting && "opacity-50 cursor-default pointer-events-none"
                  }`}>
                  <ContinueWithButton provider="google" />
                  <ContinueWithButton provider="faceit" />
                  <ContinueWithButton provider="twitter" />
                </div>
                <Button
                  className={twMerge(`pr-1`, isEmailSent && "opacity-50 pointer-events-none cursor-default")}
                  href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "register" : "login"}`}
                  variant="link"
                  disabled={isEmailSent}>
                  {queryParams === "login" ? "Create account" : "Login"}
                </Button>
              </section>
            )}
          </>
        ) : queryParams === "authCompleted" && isAuthCompleted === true ? (
          <div className="flex flex-col w-full">
            <p>image</p>
            <p className="text-success">Auth completed - thank you!</p>
          </div>
        ) : queryParams === "recoverCompleted" && isRecoverCompleted === true ? (
          <div className="w-full h-[150px] flex flex-col gap-y-4 justify-center items-center">
            <p>image</p>
            <p className="text-success">Password recovered - stay safe!</p>
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
