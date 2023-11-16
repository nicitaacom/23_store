"use client"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePathname, useSearchParams } from "next/navigation"

import axios from "axios"
import { useForm } from "react-hook-form"
import { AiOutlineUser, AiOutlineMail, AiOutlineLock } from "react-icons/ai"
import supabaseClient from "@/libs/supabaseClient"
import { AuthError } from "@supabase/supabase-js"
import { twMerge } from "tailwind-merge"

import { TAPIAuthRegister } from "@/api/auth/register/route"
import { getURL } from "@/utils/helpers"
import useDarkMode from "@/store/ui/darkModeStore"
import useUserStore from "@/store/user/userStore"
import ContinueWithButton from "@/(auth)/components/ContinueWithButton"
import { FormInput } from "@/components/ui/Inputs/Validation/FormInput"
import { Button, Checkbox } from "@/components/ui"
import { Timer } from "@/(auth)/components"
import { ModalQueryContainer } from "@/components/ui/Modals/ModalContainers"

interface AdminModalProps {
  label: string
}

interface FormData {
  username: string
  email: string
  emailOrUsername: string
  password: string
}

export function AuthModal({ label }: AdminModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const queryParams = useSearchParams().get("variant")
  const userStore = useUserStore()
  const darkMode = useDarkMode()
  const [isChecked, setIsChecked] = useState(false)
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
  } = useForm<FormData>()

  //when user submit form and got response message from server
  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
  }

  async function signInWithPassword(emailOrUsername: string, password: string) {
    //Check user wants login with email or username
    const isEmail = emailOrUsername.includes("@")
    if (isEmail) {
      try {
        const { data: user, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: emailOrUsername,
          password: password,
        })
        if (signInError) throw signInError

        if (user.user) {
          const { data: metadata } = await supabaseClient.auth.getUser()
          // TODO - set metadata with userStore.setUser
          displayResponseMessage(<p className="text-success">You are logged in</p>)
          reset()
          router.refresh()
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          displayResponseMessage(
            <p className="text-danger">{error.message === "Invalid login credentials" && "Wrong email or password"}</p>,
          )
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
    //If user want to login with username
    else {
      try {
        //Find email that matches username
        const { data: email, error: emailSelectError } = await supabaseClient
          .from("users")
          .select("email")
          .eq("username", emailOrUsername)
        if (emailSelectError) throw emailSelectError

        //Login user with email&password
        if (email && email.length > 0) {
          const { data: user, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: email[0].email!, //email 100% !== null because email && email.length >0 (thats why I use !)
            password: password,
          })
          if (signInError) throw signInError
          //I don't store user info in localstorage because zustand requires 'use client'
          //and I can use SSR with request to DB - anyway its renders on a server so I still get better performance
          if (user.user) {
            displayResponseMessage(<p className="text-success">You are logged in</p>)
            router.refresh()
          }
        } else {
          displayResponseMessage(<p className="text-danger">No user with this username</p>)
        }
      } catch (error: unknown) {
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
  }

  async function signUp(username: string, email: string, password: string) {
    try {
      const { data: user, error: signUpError } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${getURL()}auth/callback`,
          data: {
            username: username,
          },
        },
      })
      if (signUpError) throw new Error(`signUpError - ${signUpError}`)
      if (user.user) {
        //Insert row in users_cart table
        await axios.post("/api/auth/register", {
          id: user.user.id,
          email: email,
          username: username,
        } as TAPIAuthRegister)

        setResponseMessage(<p className="text-success">Check your email</p>)
        setTimeout(() => {
          setResponseMessage(
            <div className="flex flex-row text-title">
              Don&apos;t revice email?&nbsp;
              <Timer label="resend in" seconds={60}>
                <Button type="button" variant="link" onClick={() => resendVerificationEmail(email)}>
                  resend
                </Button>
              </Timer>
            </div>,
          )
        }, 5000)
      }
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        if (error.message.includes("duplicate key value violates unique constraint")) {
          displayResponseMessage(<p className="text-danger">User with this username/email already exists.</p>)
        } else {
          displayResponseMessage(<p className="text-danger">{error.message}</p>)
        }
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
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email: email,
      })
      if (error) throw error
      displayResponseMessage(<p className="text-success">Message resended</p>)
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
        redirectTo: `${location.origin}/?modal=AuthModal&variant=reset-password`,
      })
      if (error) throw error
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
      const { error } = await supabaseClient.auth.updateUser({ password: password })
      if (error) throw error
      displayResponseMessage(<p className="text-success">Your password changed</p>)
      router.push("/")
    } catch (error) {
      if (error instanceof Error && error.message === "New password should be different from the old password.") {
        displayResponseMessage(<p className="text-danger">Its already your password - enter new one</p>)
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
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (queryParams === "login") {
      signInWithPassword(data.emailOrUsername, data.password)
    } else if (queryParams === "register") {
      signUp(data.username, data.email, data.password)
      // reset()
    } else if (queryParams === "recover") {
      recoverPassword(data.email)
      reset()
    } else {
      resetPassword(data.password)
    }
  }

  return (
    <ModalQueryContainer
      className={twMerge(
        `w-[100vw] max-w-[500px] tablet:max-w-[650px] transition-all duration-300`,
        queryParams === "login" ? "h-[570px]" : queryParams === "register" ? "h-[645px]" : "h-[325px]",

        //for login height when errors
        queryParams === "login" && (errors.emailOrUsername || errors.password) && "!h-[620px]",

        //for register height when errors
        queryParams === "register" && (errors.email || errors.password) && "!h-[700px]",

        //for reset-password height when errors
        queryParams === "reset-password" && errors.password && "!h-[350px]",
      )}
      modalQuery="AuthModal">
      <div className="flex flex-col justify-center gap-y-2 w-[90%] mx-auto">
        <div className="flex flex-row gap-x-1 items-center h-[100px]">
          <Image src={darkMode.isDarkMode ? "/logo-dark.png" : "/logo-light.png"} alt="logo" width={60} height={44} />
          <h1 className="text-3xl font-bold pb-2">
            {queryParams === "login" ? "Login" : queryParams === "register" ? "Register" : "Recover"}
          </h1>
        </div>

        {queryParams === "login" || "register" || "recover" ? (
          <>
            <form className="relative w-full flex flex-col gap-y-2 mb-4" onSubmit={handleSubmit(onSubmit)}>
              {queryParams === "register" && (
                <FormInput
                  endIcon={<AiOutlineUser size={24} />}
                  register={register}
                  errors={errors}
                  id="username"
                  label="Username"
                  placeholder="HANTARESpeek"
                  disabled={isSubmitting}
                  required
                />
              )}
              {queryParams !== "login" && queryParams !== "reset-password" && (
                <FormInput
                  endIcon={<AiOutlineMail size={24} />}
                  register={register}
                  errors={errors}
                  id="email"
                  label="Email"
                  placeholder="user@big.com"
                  disabled={isSubmitting}
                  required
                />
              )}
              {queryParams === "login" && (
                <FormInput
                  endIcon={<AiOutlineUser size={24} />}
                  register={register}
                  errors={errors}
                  id="emailOrUsername"
                  label="Email or username"
                  placeholder="HANTARESpeek"
                  disabled={isSubmitting}
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
                  placeholder={queryParams === "reset-password" ? "NeW-RaNd0m_PasWorD" : "RaNd0m_PasWorD"}
                  disabled={isSubmitting}
                  required
                />
              )}
              {/* LOGIN-BODY-HELP */}
              <div className="flex justify-between mb-2">
                <div className={`${(queryParams === "recover" || queryParams === "reset-password") && "invisible"}`}>
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

              <Button variant="default-outline" disabled={isSubmitting}>
                {queryParams === "login"
                  ? "Login"
                  : queryParams === "register"
                  ? "Register"
                  : queryParams === "reset-password"
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
                  <ContinueWithButton
                    className="opacity-75 cursor-pointer"
                    href="https://github.com/vercel/next.js/issues/56832"
                    provider="faceit"
                  />
                  <div className="tooltip">
                    <ContinueWithButton className="opacity-75 cursor-pointer" provider="twitter" />
                    <div className="tooltiptext opacity-75 cursor-pointer bg-background whitespace-nowrap">
                      Supabase issue
                    </div>
                  </div>
                </div>
                <Button
                  className="pr-1"
                  href={`${pathname}?modal=AuthModal&variant=${queryParams === "login" ? "register" : "login"}`}
                  variant="link">
                  {queryParams === "login" ? "Create account" : "Login"}
                </Button>
              </section>
            )}
          </>
        ) : (
          <h1>Now change query params back to &variant=login :) </h1>
        )}
      </div>
    </ModalQueryContainer>
  )
}