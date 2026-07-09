import { SupportPageSkeleton } from "./components/SupportPageSkeleton"
import { NavbarSkeleton } from "../NavbarSkeleton"

export function SupportPageLoadingSkeleton({ ticketId }: { ticketId: string | Record<string, string | string[] | undefined> }) {
  return (
    <div className="h-screen overflow-hidden bg-background pt-16">
      <NavbarSkeleton />
      <SupportPageSkeleton ticketId={ticketId} />
    </div>
  )
}
