"use client"

import Image from "next/image"

import { MarkTicketAsCompletedSupport } from "./MarkTicketAsCompletedSupport"
import useSender from "@/hooks/ui/useSender"

interface MobileSidebarProps {
  owner_username: string
  owner_avatar_url: string
  owner_id: string
}

export function MessagesHeader({ owner_username, owner_avatar_url, owner_id }: MobileSidebarProps) {
  const { avatar_url } = useSender(owner_avatar_url, owner_id)

  return (
    <div className="w-full shadow-[inset_0px_4px_6px_rgba(0,0,0,0.4)] bg-foreground">
      <div className="flex flex-row gap-x-2 justify-between shadow-[0px_6px_4px_rgba(0,0,0,0.25)] px-4 py-2">
        <div className="flex flex-row gap-x-2 items-center">
          <Image className="rounded-md" src={avatar_url} alt="owner_avatar_url" width={32} height={32} />
          <div className="flex flex-col break-all">
            <h2 className="font-semibold text-sm truncate max-w-[calc(100vw-136px)]">{owner_username}</h2>
            {/* TODO - add active/inactive */}
            <p className="text-xs text-success">Active</p>
            {/* <p className="text-xs">Inactive</p> */}
          </div>
        </div>
        <MarkTicketAsCompletedSupport />
      </div>
    </div>
  )
}
