"use client"

import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { FormSkeleton } from "../components/ui/Skeletons/FormSkeleton"
import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../utils/supabaseClient"

import useUserStore from "../store/user/userStore"
import { Button } from "../components/ui"
import { Input } from "../components/ui/Inputs/Input"

export default function Login() {
  const navigate = useNavigate()
  const userStore = useUserStore()

  const [emailOrUsername, setEmailOrUsername] = useState<string | undefined>("")
  const [password, setPassword] = useState<string | undefined>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (userStore.isAuthenticated) {
      navigate("/", { replace: true })
      setIsLoading(false)
    }
  }, [userStore.isAuthenticated])

  useEffect(() => {
    setIsLoading(false)
  }, [])

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

  return (
    <>
      <form
        className="mx-auto min-h-[calc(100vh-58px)] px-4 mobile:px-6 tablet:px-8 laptop:px-10 desktop:px-12
      flex flex-col gap-y-4 justify-center"
        onSubmit={login}>
        {isLoading ? (
          <FormSkeleton count={3} />
        ) : (
          <>
            <h1 className="text-2xl">Login</h1>
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
            <Button type="submit">Login</Button>
            <Button variant="continue-with" onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}>
              Continue with Google
              <AiOutlineGoogle className="text-title" size={42} />
            </Button>
            <p className="text-center text-danger">{error}</p>
            <p className="text-success">{success}</p>
          </>
        )}
      </form>
    </>
  )
}
