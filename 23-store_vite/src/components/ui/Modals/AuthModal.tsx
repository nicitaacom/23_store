import { useState } from "react"

import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../../../utils/supabaseClient"

import { Button } from "../"
import { ModalContainer } from "../ModalContainer"
import { RadioButton } from "../Inputs/RadioButton"
import useUserStore from "../../../store/user/userStore"
import { InputForm } from "../Inputs/Validation/InputForm"
import { useForm } from "react-hook-form"
import { Timer } from "../Timer"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

interface FormData {
  username: string
  email: string
  password: string
  emailOrUsername: string
}

export function AuthModal({ isOpen, onClose, label }: AuthModalProps) {
  const userStore = useUserStore()

  const [isLoading, setIsLoading] = useState(false)
  const [authAction, setAuthAction] = useState("LOGIN")
  const [responseMessage, setResponseMessage] = useState<React.ReactNode>(<p></p>)

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
            onClose()
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
              onClose()
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
    if (authAction === "LOGIN") {
      setIsLoading(true)
      signInWithPassword(data.emailOrUsername, data.password)
      setIsLoading(false)
    }

    if (authAction === "REGISTER") {
      setIsLoading(true)
      signUp(data.username, data.email, data.password)
      setIsLoading(false)
    }

    if (authAction === "RECOVER") {
      setIsLoading(true)

      setIsLoading(false)
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
    <ModalContainer
      className={`w-[100vw] max-w-[500px] tablet:max-w-[650px] 
      ${authAction === "LOGIN" && "h-[70vh] tablet:max-h-[450px]"}
      ${authAction === "REGISTER" && "h-[75vh] tablet:max-h-[525px]"}
      ${authAction === "RECOVER" && "h-[50vh] tablet:max-h-[350px]"}
     py-8 transition-all duration-300`}
      isOpen={isOpen}
      onClose={onClose}>
      <div className="flex flex-col justify-center items-center w-1/2 mx-auto ">
        <h1 className="text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
        <ul className="flex flex-col tablet:flex-row w-[150%] justify-center mb-8">
          <li>
            <RadioButton label="Login" inputName="auth" onChange={() => setAuthAction("LOGIN")} defaultChecked />
          </li>
          <li>
            <RadioButton label="Register" inputName="auth" onChange={() => setAuthAction("REGISTER")} />
          </li>
          <li>
            <RadioButton label="Recover" inputName="auth" onChange={() => setAuthAction("RECOVER")} />
          </li>
        </ul>

        <form className="flex flex-col gap-y-2 w-full" onSubmit={handleSubmit(onSubmit)}>
          {authAction === "REGISTER" && (
            <InputForm
              id="username"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Username"
            />
          )}
          {authAction !== "LOGIN" && (
            <InputForm
              id="email"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Email"
            />
          )}
          {authAction === "LOGIN" && (
            <InputForm
              id="emailOrUsername"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder="Email or username"
            />
          )}
          {authAction !== "RECOVER" && (
            <InputForm
              id="password"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              type="password"
              placeholder="Passowrd"
            />
          )}
          {responseMessage}
          <Button type="submit" disabled={isLoading}>
            {authAction === "LOGIN" ? "Login" : authAction === "REGISTER" ? "Register" : "Recover"}
          </Button>
          {authAction !== "RECOVER" && (
            <Button variant="continue-with" type="reset" onClick={loginWithGoogle} disabled={isLoading}>
              Continue with Google
              <AiOutlineGoogle className="text-title" size={42} />
            </Button>
          )}
        </form>
      </div>
    </ModalContainer>
  )
}
