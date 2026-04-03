"use client"

import Image from "next/image"

import { MarkTicketAsCompletedSupport } from "./MarkTicketAsCompletedSupport"
import useSender from "@/hooks/ui/useSender"

interface MobileSidebarProps {
  owner_username: string
  owner_avatar_url: string
  owner_id: string
  ticket_id: string
}

export function MessagesHeader({ owner_username, owner_avatar_url, owner_id, ticket_id }: MobileSidebarProps) {
  const { avatar_url } = useSender(owner_avatar_url, owner_id)

  return (
    <header className="border-b border-white/8 bg-[#171922] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Image
              className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.24)]"
              src={avatar_url}
              alt="Owner avatar"
              width={44}
              height={44}
              sizes="44px"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#171922] bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">
              <span>Customer</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>#{ticket_id.slice(0, 8)}</span>
            </div>
            <h2 className="mt-1 truncate font-secondary text-xl font-bold tracking-tight text-slate-100">{owner_username}</h2>
            <p className="mt-1 text-sm text-slate-500">Open conversation</p>
          </div>
        </div>
        <MarkTicketAsCompletedSupport />
      </div>
    </header>
  )
}
