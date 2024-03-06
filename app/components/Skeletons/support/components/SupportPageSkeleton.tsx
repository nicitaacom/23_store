import "react-loading-skeleton/dist/skeleton.css"
import { MessagesBodySkeleton, MessagesFooterSkeleton, MessagesHeaderSkeleton } from "./components"
import { DesktopSidebarSkeleton } from "./components/DesktopSidebarSkeleton"
import { Params } from "next/dist/shared/lib/router/utils/route-matcher"
import Skeleton from "react-loading-skeleton"
import { MobileSidebarSkeleton } from "./components/MobileSidebarSkeleton"

export function SupportPageSkeleton({ ticketId }: { ticketId: Params }) {
  return (
    <main
      className="w-full h-[calc(100vh-81px)] overflow-x-hidden overflow-y-auto hide-scrollbar
      flex flex-row">
      {/* max-width:1024px */}

      <DesktopSidebarSkeleton />
      {typeof ticketId === "object" && Object.keys(ticketId).length !== 0 ? (
        <>
          <div className="w-full laptop:w-[calc(100%-16rem)] flex flex-col">
            <MessagesHeaderSkeleton />
            <MessagesBodySkeleton />
            <MessagesFooterSkeleton />
          </div>
        </>
      ) : (
        <>
          <main
            className="relative w-full h-full laptop:w-[calc(100%-16rem)] hidden laptop:flex
            justify-center items-center
            shadow-[inset_0px_8px_6px_rgba(0,0,0,0.4)] z-[100]"
            style={{ color: "hsl(0deg 0% 82%)", backgroundColor: "hsl(0deg 0% 19%)" }}>
            Select ticket
            <Skeleton
              duration={2}
              containerClassName="absolute bottom-0 flex w-full h-[1px]"
              style={{ display: "flex", width: "100%", height: "1px" }}
              baseColor="hsl(0deg 0% 56%)"
              highlightColor="hsl(0deg 0% 100%)"
            />
          </main>
          <MobileSidebarSkeleton />
        </>
      )}

      {/* min-width:1024px */}
    </main>
  )
}
