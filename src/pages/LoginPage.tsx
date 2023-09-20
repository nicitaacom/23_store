import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { FormSkeleton } from "../components/ui/Skeletons/FormSkeleton"
import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../utils/supabaseClient"

import useUserStore from "../store/user/userStore"
import { Button } from "../components/ui"
import { InputForm } from "../components/ui/Inputs/Validation/InputForm"
import { useForm } from "react-hook-form"

interface FormData {
  username: string
  email: string
  password: string
  emailOrUsername: string
}

export default function Login() {
  const navigate = useNavigate()
  const userStore = useUserStore()

  const [isLoading, setIsLoading] = useState(false)
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)

  useEffect(() => {
    if (userStore.isAuthenticated) {
      navigate("/", { replace: true })
      setIsLoading(false)
    }
  }, [userStore.isAuthenticated, navigate])

  useEffect(() => {
    setIsLoading(false)
  }, [])

  function displayResponseMessage(message: React.ReactNode) {
    setResponseMessage(message)
    setTimeout(() => {
      setResponseMessage(<p></p>)
    }, 5000)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()

  async function signInWithPassword(emailOrUsername: string, password: string) {
    const isEmail = emailOrUsername.includes("@")
    if (isEmail) {
      try {
        const response = await supabase.auth.signInWithPassword({ email: emailOrUsername, password: password })
        if (response.error) throw response.error
        if (response.data.user) {
          userStore.authUser(response.data.user.id)
          displayResponseMessage(<p className="text-success">You are logged in</p>)
          setTimeout(() => {
            navigate("/", { replace: true })
          }, 2500)
        }
      } catch (error) {
        displayResponseMessage(<p className="text-danger">Wrong email or password</p>)
        console.error("login with email - ", error)
      }
    } else {
      try {
        const { data, error } = await supabase.from("users").select("email").eq("username", emailOrUsername)
        if (error) throw error
        if (data && data.length > 0) {
          const response = await supabase.auth.signInWithPassword({ email: data[0].email, password: password })
          if (response.error) throw response.error

          if (response.data.user) {
            userStore.authUser(response.data.user.id)
            displayResponseMessage(<p className="text-success">You are logged in</p>)
            setTimeout(() => {
              navigate("/", { replace: true })
            }, 2500)
          }
        } else {
          displayResponseMessage(<p className="text-danger">No user with this username</p>)
          return "No user with this username - " + emailOrUsername
        }
      } catch (error) {
        const errorMessage = String(error)
        if (errorMessage.includes("AuthApiError: Email not confirmed")) {
          const formattedMessage = errorMessage.replace("AuthApiError: ", "")
          displayResponseMessage(<p className="text-danger">{formattedMessage}</p>)
        } else {
          displayResponseMessage(<p className="text-danger">Wrong email or password</p>)
          console.error("login with username - ", error)
        }
      }
    }
  }

  const onSubmit = (data: FormData) => {
    signInWithPassword(data.emailOrUsername, data.password)
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
            <h1 className="text-2xl">Login</h1>
            <InputForm
              id="emailOrUsername"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Email or username"
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

            <Button type="submit" disabled={isLoading}>
              Login
            </Button>
            <Button variant="continue-with" type="reset" onClick={loginWithGoogle}>
              Continue with Google
              <AiOutlineGoogle className="text-title" size={42} />
            </Button>
          </>
        )}
      </form>
    </>
  )
}
