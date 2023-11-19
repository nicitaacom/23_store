"use client"

import { Input } from "@/components/ui/Inputs"
import { useState } from "react"

export function MessageInput() {
  const [message, setMessage] = useState("")

  return (
    <div className="w-full bg-foreground px-8 py-4">
      <Input value={message} onChange={e => setMessage(e.target.value)} tabIndex={0} placeholder="Enter message..." />
    </div>
  )
}
