import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function MobileSidebarSkeleton() {
  return (
    <div className="flex laptop:hidden w-full h-full flex-col gap-y-4 py-8">
      <div className="flex justify-center items-center px-16">
        <div
          className="h-[42px] w-full relative text-center flex justify-center items-center pl-4 pr-8 py-2"
          style={{ border: "1px solid hsl(0deg 0% 56%)" }}>
          <Skeleton
            duration={2}
            style={{ width: "144px", height: "12px" }}
            baseColor="hsl(0deg 0% 13%)"
            highlightColor="hsl(0deg 0% 100%)"
          />
        </div>
      </div>
    </div>
  )
}
