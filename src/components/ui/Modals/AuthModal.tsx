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

  const [username, setUsername] = useState<string | undefined>("") //for REGISTER
  const [email, setEmail] = useState<string | undefined>("") //for RECOVER

  const [emailOrUsername, setEmailOrUsername] = useState<string | undefined>("") //for LOGIN
  const [password, setPassword] = useState<string | undefined>("") //for LOGIN and REGISTER

  const [authAction, setAuthAction] = useState("LOGIN")

  // const [inputErrors, setInputErrors] = useState({
  //   usernameError: "3-16 characters - no symbols",
  //   emailError: "Enter actuall email" || "User with this email already exits",
  //   emailOrUsernameError: "",
  //   passwordError: "Wrong Password or email",
  // })
  // const [submitError, setSubmitError] = useState({
  //   usernameTaken: <p className="text-danger">Username already taken - choose a different one</p>,
  //   wrongEmailOrPassword: <p className="text-danger">Wrong email or password</p>,
  //   wrongUsernameOrPassword: <p className="text-danger">Wrong username or password</p>,
  //   unknownError: (
  //     <p className="text-danger">
  //       "Unknown error occured - please fill out
  //       <Button
  //         variant="info"
  //         onClick={() => {
  //           /* OPEN MODAL WITH FORM AND SEND FORM TO TELEGRAM */
  //         }}>
  //         this
  //       </Button>
  //       form to get support and help us improve our service"
  //     </p>
  //   ),
  // })

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
          }
        } catch (error) {
          console.error("login with email - ", error)
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
            }
          } else throw "LoginPage.tsx - no data"
        } catch (error) {
          console.error("login with username - ", error)
        }
      }
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    console.log(78)
    if (email && password) {
      try {
        const response = await supabase.auth.signUp({ email: email, password: password })
        if (response.error) throw response.error

        if (response.data.user?.id) {
          const { error } = await supabase
            .from("users")
            .insert({ id: response.data.user.id, username: username, email: email })
          if (error) throw error

          userStore.authUser(response.data.user.id)
        }
      } catch (error) {
        console.error("register - ", error)
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
      ${authAction === "LOGIN" && "h-[70vh] tablet:max-h-[450px]"}
      ${authAction === "REGISTER" && "h-[75vh] tablet:max-h-[500px]"}
      ${authAction === "RECOVER" && "h-[50vh] tablet:max-h-[350px]"}
     py-8 transition-all duration-300`}
      isOpen={isOpen}
      onClose={() => onClose()}>
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

        <form className="flex flex-col gap-y-2" onSubmit={authAction === "Login" ? login : register}>
          {authAction === "REGISTER" && (
            <Input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              pattern="^[A-Za-z0-9]{3,16}$"
              // inputError={inputErrors.usernameError}
              required
            />
          )}
          {authAction !== "LOGIN" && (
            <Input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              pattern="^.+@.+$"
              // inputError={inputErrors.emailError}
            />
          )}
          {authAction === "LOGIN" && (
            <Input
              type="text"
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              placeholder="Email or username"
            />
          )}
          {authAction !== "RECOVER" && (
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
          )}
          <p className="text-danger">Submit error</p>
          <Button type="submit">
            {authAction === "LOGIN" ? "Login" : authAction === "REGISTER" ? "Register" : "Recover"}
          </Button>
          {authAction !== "RECOVER" && (
            <Button variant="continue-with" onClick={loginWithGoogle}>
              Continue with Google
              <AiOutlineGoogle className="text-title" size={42} />
            </Button>
          )}
        </form>
      </div>
    </ModalContainer>
  )
}
