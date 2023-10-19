import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function InitialPageLoadingSkeleton() {
  return (
    <div className="inset-0 z-[99] bg-[#121212] h-[100vh]" id="initial-loading">
      <Skeleton
        style={{ width: "80vw", height: "100%" }}
        baseColor="hsl(var(--foreground))"
        highlightColor="hsl(var(--foreground-hover))"
      />
    </div>
  )
}
