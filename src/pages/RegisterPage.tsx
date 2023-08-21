"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { FormSkeleton } from "../components/ui/Skeletons/FormSkeleton"
import { AiOutlineGoogle } from "react-icons/ai"
import supabase from "../utils/supabaseClient"

import useUserStore from "../store/user/userStore"
import { Button } from "../components/ui"
import { Input } from "../components/ui/Inputs/Input"

export default function Register() {
  const navigate = useNavigate()

  const userStore = useUserStore()

  const [usernameValue, setUsernameValue] = useState<string | undefined>("")
  const [email, setEmail] = useState<string | undefined>("")
  const [password, setPassword] = useState<string | undefined>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (userStore.isAuthenticated) {
      navigate("/")
      setIsLoading(false)
    }
  }, [userStore.isAuthenticated, navigate])

  useEffect(() => {
    setIsLoading(false)
  }, [])

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

  return (
    <>
      <form
        className="mx-auto min-h-[calc(100vh-58px)] max-w-[500px] px-4 mobile:px-6 tablet:px-8 laptop:px-10 desktop:px-12
      flex flex-col gap-y-4 justify-center"
        onSubmit={register}>
        {isLoading ? (
          <FormSkeleton count={3} />
        ) : (
          <>
            <h1 className="text-2xl">Register</h1>
            <Input
              type="text"
              value={usernameValue}
              onChange={e => setUsernameValue(e.target.value)}
              placeholder="Username"
            />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
            <Button type="submit">Register</Button>
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
