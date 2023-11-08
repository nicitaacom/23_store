"use client"

import React from "react"
import { useSearchParams } from "next/navigation"

export function CartModalContainer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()

  return <>{searchParams.getAll("modal").includes("CartModal") && children}</>
}
