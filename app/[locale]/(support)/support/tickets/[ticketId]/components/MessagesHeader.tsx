"use client"

import { twMerge } from "tailwind-merge"

import { MarkTicketAsCompletedSupport } from "./MarkTicketAsCompletedSupport"
import { getSupportMessageDayLabel } from "@/utils/support/getSupportMessageDayLabel"
import { useScopedI18n } from "@/locales/client"
import useSender from "@/hooks/ui/useSender"
import { ImageWithFallback } from "@/components/ui/ImageWithFallback"
import { OrganicCanvasBackground } from "@/components/OrganicCanvasBackground"

interface MessagesHeaderProps {
  owner_username: string
  owner_avatar_url: string
  owner_id: string
  ticket_id: string
  is_open: boolean
  ticket_created_at: string
}

// http://localhost:6006/?path=/story/support-supportdashboard--desktop-ticket-list
export function MessagesHeader({ owner_username, owner_avatar_url, owner_id, ticket_id, is_open, ticket_created_at }: MessagesHeaderProps) {
  const t = useScopedI18n("support")
  const { avatar_url } = useSender(owner_avatar_url, owner_id)

  return (
    <OrganicCanvasBackground
      className="h-auto shrink-0 overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.06),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))]"
      parentClassName="relative flex items-center justify-between gap-3 px-3 py-3 tablet:px-4"
      particleCount={3}
      brandHsl="137, 82%, 52%"
      canvasOpacity={0.4}
      verticalOverflow={18}>
      <div className="flex min-w-0 items-center gap-3">
        <ImageWithFallback
          className="h-10 w-10 rounded-md border border-white/10 object-cover"
          src={avatar_url}
          alt="Owner avatar"
          width={40}
          height={40}
          sizes="40px"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85">Customer • #{ticket_id.slice(0, 8)}</p>
          <h2 className="truncate text-[18px] font-semibold text-white tablet:text-[20px]">{owner_username}</h2>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span
            className={twMerge(
              "hidden h-7 items-center rounded border px-2 text-[10px] font-semibold uppercase tracking-[0.18em] mobile:inline-flex",
              is_open
                ? "border-success-accent/30 bg-success-accent/12 text-success-accent"
                : "border-danger/30 bg-danger/12 text-danger",
            )}>
            {is_open ? t("status_open") : t("status_closed")}
          </span>
          <MarkTicketAsCompletedSupport className="border-success-accent/30 bg-success-accent/10 text-success-accent hover:bg-success-accent/15" />
        </div>
        <span className="hidden text-[11px] text-white/50 mobile:inline">{t("opened_on", { date: getSupportMessageDayLabel(ticket_created_at) })}</span>
      </div>
    </OrganicCanvasBackground>
  )
}
