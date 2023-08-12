"use client"

import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { FormSkeleton } from "../components/FormSkeleton"
import supabase from "../utils/supabaseClient"

import useAuthorized from "../hooks/useAuthorized"
import useUserStore from "../store/userStore"
import useGetUsername from "../hooks/useGetUsername"
import useGetUserId from "../hooks/useGetUserId"
import { Button } from "../components/index"
import { Input } from "../components/ui/Input"

export default function Login() {

  const navigate = useNavigate()
  const userStore = useUserStore()


  const [email, setEmail] = useState<string | undefined>("")
  const [password, setPassword] = useState<string | undefined>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { isAuthenticated } = useAuthorized()
  const { username } = useGetUsername()
  const { userId } = useGetUserId()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
      setIsLoading(false)
    }
  }, [isAuthenticated])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (email && password) {
        const response = await supabase.auth.signInWithPassword({ email: email, password: password })
        if (response.data.user) {

          const setProfilePictureUrl = async () => {
            const { data } = await supabase.from("users")
              .select("profile_picture_url")
              .eq("id", userId)
            if (data) {
              userStore.setProfilePictureUrl(data[0]?.profile_picture_url as string)
            }
          }

          const { data } = await supabase.from("users")
            .select("username")
            .eq("id", response.data.user?.id)
          if (data && data.length > 0 && data[0]?.username) {
            const { username } = data[0]
            navigate('/', { replace: true })
          }

          setProfilePictureUrl()
          setIsError(false)
          setIsSuccess(true)
        }
      }
    } catch (error) {
      console.error("login - ", error)
      setIsSuccess(false)
      setIsError(true)
    }
  }

  useEffect(() => {
    setIsLoading(false)
  }, [])

  return (
    <>
      <form className="mx-auto flex w-1/4 flex-col gap-y-4" onSubmit={login}>
        {isLoading ? (
          <FormSkeleton count={3} />
        ) : (
          <>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
            <Button type="submit">Login</Button>
            {isError && <p className="text-center text-danger">Error! - an error occured - please try later</p>}
            {isSuccess && <p className="text-success">Success!</p>}
          </>
        )}
      </form>
    </>
  )
}
