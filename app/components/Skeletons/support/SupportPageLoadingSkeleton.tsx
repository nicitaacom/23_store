import "react-loading-skeleton/dist/skeleton.css"
import { NavbarSkeleton } from "../NavbarSkeleton"
import { SupportPageSkeleton } from "./components/SupportPageSkeleton"
export function SupportPageLoadingSkeleton({ ticketId }: { ticketId: string | Record<string, string | string[] | undefined> }) {
  return (
    <div className="inset-0 z-[99] bg-[#202020] h-[100vh] overflow-hidden">
      <NavbarSkeleton />
      <SupportPageSkeleton ticketId={ticketId} />
    </div>
  )
}
