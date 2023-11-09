"use client"

import { AdminPanelModal, AuthModal, CartModal, ChangeLanguageModal } from "@/components/ui/Modals"
import { IDBProduct } from "@/interfaces/IDBProduct"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

//This provider uses only for modals based on query params
export function ModalsQueryProvider({ ownerProducts }: { ownerProducts: IDBProduct[] }) {
  const [isMounted, setIsMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  if (searchParams.getAll("modal").includes("AdminPanel")) {
    return <AdminPanelModal label="Admin Panel" ownerProducts={ownerProducts} />
  }

  if (searchParams.getAll("modal").includes("AuthModal")) {
    return <AuthModal label="Auth" />
  }
  if (searchParams.getAll("modal").includes("ChangeLanguage")) {
    return <ChangeLanguageModal label="Auth" />
  }
  if (searchParams.getAll("modal").includes("CartModal")) {
    return <CartModal label="Auth" />
  }
}
