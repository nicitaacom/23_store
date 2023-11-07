"use client"
import { useSearchParams } from "next/navigation"
import React from "react"
import { CartModal } from ".."
import useCartStore from "@/store/user/cartStore"

export function CartModalContainer({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const cartStore = useCartStore()

  return <>{searchParams.getAll("modal").includes("CartModal") && children}</>
}
