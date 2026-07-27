import { NavbarSkeleton } from "../NavbarSkeleton"
import { SupportPageSkeleton } from "./components/SupportPageSkeleton"

// http://localhost:6006/?path=/story/foundations-skeletons--page-loading
export function SupportPageLoadingSkeleton({ ticketId }: { ticketId: string | Record<string, string | string[] | undefined> }) {
  return (
    <div className="h-screen overflow-hidden bg-background pt-16">
      <NavbarSkeleton />
      <SupportPageSkeleton ticketId={ticketId} />
    </div>
  )
}
