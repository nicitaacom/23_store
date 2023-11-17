"use client"
import { Button } from "@react-email/components"
import { useRouter } from "next/navigation"

export function BackToMainButton() {
  const router = useRouter()
  return <Button onClick={() => router.push("/")}>Back to main</Button>
}
