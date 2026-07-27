"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function BackToMainButton() {
  const router = useRouter()
  return (
    <Button variant="default-outline" onClick={() => router.push("/")}>
      Back to main
    </Button>
  )
}
