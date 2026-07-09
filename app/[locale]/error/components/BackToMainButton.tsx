"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui"

export function BackToMainButton() {
  const router = useRouter()
  return (
    <Button variant="default-outline" onClick={() => router.push("/")}>
      Back to main
    </Button>
  )
}
