"use client"

import React from "react"
import { useSearchParams } from "next/navigation"

export function ChangeLanguageModalContainer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  return <>{searchParams.getAll("modal").includes("ChangeLanguage") && children}</>
}
