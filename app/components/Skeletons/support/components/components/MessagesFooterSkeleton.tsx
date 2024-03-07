import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function MessagesFooterSkeleton() {
  return (
    <div className="relative w-full bg-background z-[101]">
      <div className="w-full h-[49px] bg-foreground p-3 flex items-center">
        <Skeleton
          duration={2}
          containerClassName="absolute top-0 left-0 flex w-full h-[1px]"
          style={{ display: "flex", width: "100%", height: "1px" }}
          baseColor="hsl(0deg 0% 56%)"
          highlightColor="hsl(0deg 0% 100%)"
        />
        <p style={{ color: "hsla(0, 0%, 100%, 0.6)" }}>Enter message...</p>
      </div>
    </div>
  )
}
