"use client"

import supabaseClient from "@/libs/supabaseClient"

import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

export default function LoginButton() {
  const router = useRouter()

  async function login() {
    await supabaseClient.auth.signInWithPassword({
      email: "example@gmail.com",
      password: "test123",
    })
    router.refresh()
  }

  return <Button variant="default-outline">Login</Button>
}
