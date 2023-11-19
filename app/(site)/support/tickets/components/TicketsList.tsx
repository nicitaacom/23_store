import getTickets from "@/actions/getTickets"
import { DesktopSidebar } from "./DesktopSidebar"
import { MobileSidebar } from "./MobileSidebar"

export async function TicketsList({ children }: { children: React.ReactNode }) {
  const tickets = await getTickets()

  return (
    <div className="relative h-[calc(100vh-64px)] flex">
      <DesktopSidebar />
      <MobileSidebar tickets={tickets} />
      <main className="hidden laptop:flex w-[calc(100%-16rem)] h-full">{children}</main>
    </div>
  )
}
