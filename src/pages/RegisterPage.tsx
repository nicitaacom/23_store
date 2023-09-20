import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { FormSkeleton } from "../components/ui/Skeletons/FormSkeleton"
import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../utils/supabaseClient"

import useUserStore from "../store/user/userStore"
import { Button } from "../components/ui"
import { InputForm } from "../components/ui/Inputs/Validation/InputForm"
import { Timer } from "../components/ui/Timer"
import { useForm } from "react-hook-form"

interface FormData {
  username: string
  email: string
  password: string
  emailOrUsername: string
}

export default function Register() {
  const navigate = useNavigate()

  const userStore = useUserStore()

  const [isLoading, setIsLoading] = useState(false)
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)

  useEffect(() => {
    const checkVerifiedEmail = async () => {
      const response = await supabase.auth.getUser()
      if (userStore.isAuthenticated && response.data.user?.id) {
        navigate("/")
        setIsLoading(false)
      }
    }
    checkVerifiedEmail()
  }, [userStore.isAuthenticated, navigate])

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()

  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
    setTimeout(() => {
      setResponseMessage(<p></p>)
    }, 5000)
  }

  async function signUp(username: string, email: string, password: string) {
    try {
      const response = await supabase.auth.signUp({ email: email, password: password })
      if (response.error) throw response.error

      if (response.data.user?.id) {
        const { error: errorUsersInsert } = await supabase
          .from("users")
          .insert({ id: response.data.user.id, username: username, email: email })
        if (errorUsersInsert) throw errorUsersInsert
        const { error: errorUsersCartInsert } = await supabase.from("users_cart").insert({ id: response.data.user.id })
        if (errorUsersCartInsert) throw errorUsersCartInsert

        userStore.authUser(response.data.user.id)
        displayResponseMessage(<p className="text-success">Check your email</p>)
        setTimeout(() => {
          setResponseMessage(
            <div className="flex flex-row">
              Don't revice email?&nbsp;
              <Timer label="resend in" seconds={45}>
                <Button variant="link" onClick={() => resendVerificationEmail(email)}>
                  resend
                </Button>
              </Timer>
            </div>,
          )
        }, 10000)
      }
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === "23505") {
        displayResponseMessage(<p className="text-danger">This user already exists</p>)
      } else if ((error as { code?: string })?.code === "23503") {
        displayResponseMessage(<p className="text-danger">User with this email already exists</p>)
      } else {
        displayResponseMessage(<p className="text-danger">You may use register only 3 times per hour.</p>)
      }
      console.error("signUp - ", error)
    }
  }

  const onSubmit = (data: FormData) => {
    if (userStore.isAuthenticated) {
      displayResponseMessage(<p className="text-danger">You must verify your email to register new user</p>)
    } else {
      signUp(data.username, data.email, data.password)
    }
  }

  async function resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    })
    if (error) throw error
    displayResponseMessage(<p className="text-success">Message resended</p>)
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" })
  }

  return (
    <>
      <form
        className="mx-auto min-h-[calc(100vh-58px)] max-w-[500px] px-4 mobile:px-6 tablet:px-8 laptop:px-10 desktop:px-12
      flex flex-col gap-y-4 justify-center"
        onSubmit={handleSubmit(onSubmit)}>
        {isLoading ? (
          <FormSkeleton count={3} />
        ) : (
          <>
            <h1 className="text-2xl">Register</h1>
            <InputForm
              id="username"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Username"
            />
            <InputForm
              id="email"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Email"
            />
            <InputForm
              id="password"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              type="password"
              placeholder="Passowrd"
            />
            {responseMessage}
            <Button type="submit">Register</Button>
            <Button variant="continue-with" onClick={loginWithGoogle}>
              Continue with Google
              <AiOutlineGoogle className="text-title" size={42} />
            </Button>
          </>
        )}
      </form>
    </>
  )
}
