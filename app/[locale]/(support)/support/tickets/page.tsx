import { EmptyState } from "./components/EmptyState"
import getInitialTickets from "@/actions/getInitialTickets"

export default async function SupportChatPage() {
  const getInitialTicketsResp = await getInitialTickets()

  if (getInitialTicketsResp.length === 0) return <EmptyState />

  return (
    <main className="hidden h-full min-w-0 flex-1 laptop:flex">
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border-color/35 bg-foreground/35 p-6">
        <div className="max-w-lg text-center">
          <p className="font-primary text-[11px] font-semibold uppercase tracking-[0.28em] text-success">Support workspace</p>
          <h1 className="mt-4 font-secondary text-4xl font-bold tracking-tight text-title">Select a conversation</h1>
          <p className="mt-3 text-base leading-7 text-subTitle">
            Pick a ticket from the left to review the thread, reply faster, and keep unread conversations in view.
          </p>
        </div>
      </div>
    </main>
  )
}
