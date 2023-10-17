"use client"
import useUserStore from "@/store/user/userStore"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

export default function Page() {
  const userStore = useUserStore()
  const router = useRouter()

  const userId = useSearchParams().get("userId")
  const username = useSearchParams().get("username")
  const email = useSearchParams().get("email")
  const profile_picture_url = useSearchParams().get("profile_picture_url")
  userStore.setUser(userId ?? "", username ?? "", email ?? "", profile_picture_url ?? "")
  router.push("/")
}
