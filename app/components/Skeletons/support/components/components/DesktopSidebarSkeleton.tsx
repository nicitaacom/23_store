import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function DesktopSidebarSkeleton() {
  return (
    <div className="hidden laptop:flex flex-col w-64 h-full">
      <div
        className="relative w-full flex flex-row gap-x-2 px-4 py-2 h-[60px]"
        style={{ borderBottom: "1px solid hsl(0deg 0% 56%)" }}>
        {/* AVATAR_URL */}
        <Skeleton
          duration={2}
          containerClassName="flex w-[32px] h-[32px] rounded-full"
          style={{
            display: "flex",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid hsl(0deg 0% 56%)",
          }}
          baseColor="hsl(0deg 0% 13%)"
          highlightColor="hsl(0deg 0% 100%)"
        />
        <div className="flex flex-col max-w-full pr-8">
          <Skeleton
            duration={2}
            containerClassName="flex w-[160px] h-[12px] mt-[4px]"
            style={{
              display: "flex",
              width: "160px",
              height: "12px",
              marginTop: "4px",
            }}
            baseColor="hsl(0deg 0% 13%)"
            highlightColor="hsl(0deg 0% 100%)"
          />
          <Skeleton
            duration={2}
            containerClassName="flex w-[140px] h-[12px] mt-[7px]"
            style={{
              display: "flex",
              width: "140px",
              height: "10px",
              marginTop: "7px",
            }}
            baseColor="hsl(0deg 0% 13%)"
            highlightColor="hsl(0deg 0% 100%)"
          />
        </div>
      </div>
    </div>
  )
}
