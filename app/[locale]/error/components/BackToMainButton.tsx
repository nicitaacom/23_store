"use client"

import { Button } from "@/components/ui"

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function BackToMainButton() {
  return (
    <Button
      className="h-12"
      data-cy="error-back-to-main"
      variant="default-outline"
      onClick={() => window.location.assign("/")}>
      Back to main
    </Button>
  )
}
