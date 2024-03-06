import Image from "next/image"
import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function MessagesHeaderSkeleton() {
  return (
    <div
      className="h-[64px] flex flex-row gap-x-2 justify-between items-center px-4 py-2 shadow-[0px_6px_4px_rgba(0,0,0,0.25)] z-[100]"
      style={{ backgroundColor: "hsl(0deg 0% 19%)", boxShadow: "0px 6px 4px rgba(0,0,0,0.25)" }}>
      <div className="flex flex-row gap-x-2 items-center">
        {/* AVATAR */}
        <Skeleton
          duration={2}
          containerClassName="tablet:h-[32px] tablet:h-[32px] mb-[4px]"
          style={{ width: "32px", height: "32px", borderRadius: "50%", marginBottom: "4px" }}
          baseColor="hsl(0deg 0% 13%)"
          highlightColor="hsl(0deg 0% 100%)"
        />
        <div className="flex flex-col break-all">
          {/* USERNAME */}
          <Skeleton
            duration={2}
            containerClassName="flex w-[320px] h-[12px] mt-[3px]"
            style={{ display: "flex", width: "320px", height: "12px", marginTop: "3px" }}
            baseColor="hsl(0deg 0% 13%)"
            highlightColor="hsl(0deg 0% 100%)"
          />
          <p style={{ color: "hsl(118deg 80% 78%)", fontSize: "12px", fontWeight: "400", marginTop: "5px" }}>Active</p>
        </div>
      </div>
      <div className="p-2">
        {/* TODO - create custom component with highlight color */}
        <Image
          className="w-[32px] h-[32px]"
          src="/mark-ticket-as-completed-dark.png"
          alt="close ticket"
          width={32}
          height={32}
        />
      </div>
    </div>
  )
}
