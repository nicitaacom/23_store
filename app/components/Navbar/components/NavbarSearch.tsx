"use client"

import { Input } from "@/components/Inputs"
import { useState } from "react"

import { BiSearchAlt } from "react-icons/bi"

export default function NavbarSearch() {
  const [search, setSearch] = useState("")
  return (
    <Input
      startIcon={<BiSearchAlt size={24} />}
      className="hidden tablet:flex w-[40vw] max-w-[600px]"
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search..."
    />
  )
}
