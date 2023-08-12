"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { FormSkeleton } from "../components/FormSkeleton"
import supabase from "../utils/supabaseClient"

import useUserStore from "../store/userStore"
import useAuthorized from "../hooks/useAuthorized"
import useGetUserId from "../hooks/useGetUserId"
import useGetUsername from "../hooks/useGetUsername"
import { Button } from "../components/index"
import { Input } from "../components/ui/Input"

export default function Register() {
  const navigate = useNavigate()

  const userStore = useUserStore()

  const { isAuthenticated } = useAuthorized()
  const { userId } = useGetUserId()
  const { username } = useGetUsername()

  const [usernameValue, setUsernameValue] = useState<string | undefined>("")
  const [email, setEmail] = useState<string | undefined>("")
  const [password, setPassword] = useState<string | undefined>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)



  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
      setIsLoading(false)
    }
  }, [isAuthenticated])


  async function register(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (email && password) {
        const response = await supabase.auth.signUp({ email: email, password: password })
        if (response.error) throw response.error
        if (response.data.user?.id) {
          const { error } = await supabase.from("users")
            .insert({ username: username })
          if (error) throw error
          console.log('52')
          setIsError(false)
          setIsSuccess(true)
          /* auth user after success register */
          const response = await supabase.auth.signInWithPassword({ email: email, password: password })

          const setProfilePictureUrl = async () => {
            const { data } = await supabase.from("users").select("profile_picture_url").eq("id", response.data.user?.id)
            if (data) {
              userStore.setProfilePictureUrl(data[0]?.profile_picture_url as string)
            }
          }

          const { data } = await supabase.from("users")
            .select("username")
            .eq("user_id", response.data.user?.id)
          if (data && data.length > 0 && data[0]?.username) {
            const { username } = data[0]
            navigate('/', { replace: true })
          }

          setProfilePictureUrl()
        }
      }
    } catch (error) {
      console.error("register - ", error)
      setIsSuccess(false)
      setIsError(true)
    }
  }

  useEffect(() => {
    setIsLoading(false)
  }, [])


  return (
    <>
      <form className="mx-auto flex w-1/4 flex-col gap-y-4" onSubmit={register}>
        {isLoading ? (
          <FormSkeleton count={3} />
        ) : (
          <>
            <Input type="text" value={usernameValue} onChange={e => setUsernameValue(e.target.value)} placeholder="Username" />
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
            <Button type="submit">Register</Button>
            {isError && <p className="text-center text-danger">Error! - an error occured - please try later</p>}
            {isSuccess && <p className="text-success">Success! - check your email</p>}
          </>
        )}
      </form>
    </>
  )
}
