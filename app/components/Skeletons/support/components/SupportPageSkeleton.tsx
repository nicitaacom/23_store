import { DesktopSidebarSkeleton } from "./components/DesktopSidebarSkeleton"
import { MessagesBodySkeleton, MessagesFooterSkeleton, MessagesHeaderSkeleton } from "./components"
import { MobileSidebarSkeleton } from "./components/MobileSidebarSkeleton"

export function SupportPageSkeleton({ ticketId }: { ticketId: string | Record<string, string | string[] | undefined> }) {
  const hasTicket = typeof ticketId === "object" && Object.keys(ticketId).length !== 0

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 bg-background px-2 pb-2 pt-2 laptop:gap-4 laptop:px-4 laptop:pb-4">
      <DesktopSidebarSkeleton />
      {hasTicket ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/35">
          <MessagesHeaderSkeleton />
          <MessagesBodySkeleton />
          <MessagesFooterSkeleton />
        </div>
      ) : (
        <>
          <div className="hidden min-w-0 flex-1 items-center justify-center rounded-lg border border-border-color/35 bg-foreground/35 p-6 laptop:flex">
            <div className="w-full max-w-lg animate-pulse text-center">
              <div className="mx-auto h-8 w-48 rounded bg-foreground/60" />
              <div className="mx-auto mt-3 h-3 w-72 rounded bg-foreground/40" />
              <div className="mx-auto mt-2 h-3 w-56 rounded bg-foreground/40" />
            </div>
          </div>
          <MobileSidebarSkeleton />
        </>
      )}
    </div>
  )
}
