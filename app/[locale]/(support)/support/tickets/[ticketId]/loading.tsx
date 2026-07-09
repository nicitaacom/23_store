import { MessagesBodySkeleton } from "@/components/Skeletons/support/components/components/MessagesBodySkeleton"
import { MessagesFooterSkeleton } from "@/components/Skeletons/support/components/components/MessagesFooterSkeleton"
import { MessagesHeaderSkeleton } from "@/components/Skeletons/support/components/components/MessagesHeaderSkeleton"

// Shown while the clicked ticket's messages fetch so the previous ticket's thread does not linger on screen.
export default function TicketLoading() {
  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-color/35 bg-foreground/35">
      <MessagesHeaderSkeleton />
      <MessagesBodySkeleton />
      <MessagesFooterSkeleton />
    </main>
  )
}
