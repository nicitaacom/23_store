"use client"
import { useSearchParams } from "next/navigation"
import React from "react"

export function ChangeLanguageModalContainer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  return <>{searchParams.getAll("modal").includes("ChangeLanguage") && children}</>
}
