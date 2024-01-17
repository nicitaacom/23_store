"use client"

import { AuthModal } from "@/(auth)/AuthModal/AuthModal"
import { AdminPanelModal, CartModal, ChangeLanguageModal } from "@/components/ui/Modals"
import { TProductDB } from "@/interfaces/product/TProductDB"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

//This provider uses only for modals based on query params
export function ModalsQueryProvider({ ownerProducts }: { ownerProducts: TProductDB[] }) {
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  if (searchParams?.getAll("modal").includes("AdminPanel")) {
    return <AdminPanelModal label="Admin Panel" ownerProducts={ownerProducts} />
  }
  if (searchParams?.getAll("modal").includes("AuthModal")) {
    return <AuthModal label="Auth" />
  }
  if (searchParams?.getAll("modal").includes("ChangeLanguage")) {
    return <ChangeLanguageModal label="Change language" />
  }
  if (searchParams?.getAll("modal").includes("CartModal")) {
    return <CartModal label="Cart" />
  }
}
