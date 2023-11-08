"use client"
import useUserStore from "@/store/user/userStore"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function Page() {
  const userStore = useUserStore()
  const router = useRouter()

  const userId = useSearchParams().get("userId")
  const username = useSearchParams().get("username")
  const email = useSearchParams().get("email")
  const avatar_url = useSearchParams().get("avatar_url")
  useEffect(() => {
    userStore.setUser(userId ?? "", username ?? "", email ?? "", avatar_url ?? "")
    router.push("/")
    //to prevent error about too many re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
