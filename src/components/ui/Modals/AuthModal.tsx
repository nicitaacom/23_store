import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../../../utils/supabaseClient"

import { Button } from "../"
import { Input } from "../Inputs"
import { ModalContainer } from "../ModalContainer"
import { RadioButton } from "../Inputs/RadioButton"
import useUserStore from "../../../store/user/userStore"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  label: string
}

export function AuthModal({ isOpen, onClose, label }: AuthModalProps) {
  const userStore = useUserStore()
  const navigate = useNavigate()

  const [usernameValue, setUsername] = useState<string | undefined>("")
  const [email, setEmail] = useState<string | undefined>("")

  const [emailOrUsername, setEmailOrUsername] = useState<string | undefined>("")
  const [password, setPassword] = useState<string | undefined>("")

  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")

  const [authAction, setAuthAction] = useState("Login")

  async function login(e: React.FormEvent) {
    e.preventDefault()
    if (emailOrUsername && password) {
      const isEmail = emailOrUsername.includes("@")

      if (isEmail) {
        try {
          const response = await supabase.auth.signInWithPassword({ email: emailOrUsername, password: password })
          if (response.error) throw response.error

          if (response.data.user) {
            userStore.authUser(response.data.user.id)
            navigate(`/`, { replace: true })
            setSuccess("Success!")
          }
        } catch (error) {
          console.log(58, "error - ", error)
          setError("Error!")
        }
      } else {
        try {
          const { data, error } = await supabase.from("users").select("email").eq("username", emailOrUsername)
          if (error) throw error
          if (data) {
            const response = await supabase.auth.signInWithPassword({ email: data[0].email, password: password })
            if (response.error) throw response.error

            if (response.data.user) {
              userStore.authUser(response.data.user.id)
              setSuccess("You logged in!")
            } else {
              setError("user not found - made a typo?")
            }
          } else throw "LoginPage.tsx - no data"
        } catch (error) {
          console.error(78, "login - ", error)
          setError("Error")
        }
      }
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    if (email && password) {
      try {
        const response = await supabase.auth.signUp({ email: email, password: password })
        if (response.error) throw response.error

        if (response.data.user?.id) {
          const { error } = await supabase
            .from("users")
            .insert({ id: response.data.user.id, username: usernameValue, email: email })
          if (error) throw error

          userStore.authUser(response.data.user.id)
          setSuccess("Check your email")
        }
      } catch (error) {
        console.error("register - ", error)
        setError("Error")
      }
    }
  }

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" })
    const response = await supabase.auth.getSession()
    setTimeout(() => {
      console.log("response - ", response)
    }, 1000)
    console.log(105, "response - ", response)
    console.log(106, "response.data - ", response.data)
  }

  return (
    <ModalContainer
      className={`w-[100vw] max-w-[500px] tablet:max-w-[650px] 
      ${authAction === "Login" && "h-[70vh] tablet:max-h-[450px]"}
      ${authAction === "Register" && "h-[75vh] tablet:max-h-[500px]"}
     py-8 transition-all duration-500`}
      isOpen={isOpen}
      onClose={() => onClose()}>
      <div className="flex flex-col justify-center items-center w-1/2 mx-auto ">
        <h1 className="text-4xl text-center whitespace-nowrap mb-8">{label}</h1>
        <ul className="flex flex-col tablet:flex-row w-[150%] justify-center mb-8">
          <li>
            <RadioButton label="Login" inputName="auth" onChange={e => setAuthAction(e.target.value)} defaultChecked />
          </li>
          <li>
            <RadioButton label="Register" inputName="auth" onChange={e => setAuthAction(e.target.value)} />
          </li>
        </ul>

        <div className="flex flex-col gap-y-2">
          {authAction === "Login" && (
            <form className="flex flex-col gap-y-2" onSubmit={login}>
              <Input
                type="text"
                value={emailOrUsername}
                onChange={e => setEmailOrUsername(e.target.value)}
                placeholder="Email or username"
              />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
              />

              <p className="text-success">{success}</p>
              <p className="text-danger">{error}</p>
              <Button type="submit">Login</Button>
              <Button variant="continue-with" onClick={loginWithGoogle}>
                Continue with Google
                <AiOutlineGoogle className="text-title" size={42} />
              </Button>
            </form>
          )}

          {authAction === "Register" && (
            <form className="flex flex-col gap-y-2" onSubmit={register}>
              <Input
                type="text"
                value={usernameValue}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
              />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
              />
              <p className="text-success">{success}</p>
              <p className="text-danger">{error}</p>
              <Button type="submit">Register</Button>
              <Button variant="continue-with" onClick={loginWithGoogle}>
                Continue with Google
                <AiOutlineGoogle className="text-title" size={42} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </ModalContainer>
  )
}
