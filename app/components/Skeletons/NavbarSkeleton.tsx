import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"

export function NavbarSkeleton() {
  return (
    <div className="flex flex-col max-h-[48px] mobile:max-h-[62px] px-4 tablet:px-6 laptop:px-8 py-2">
      <Skeleton
        duration={2}
        containerClassName="flex h-[3px]"
        style={{ display: "flex", height: "3px" }}
        baseColor="hsl(0deg 0% 7%)"
        highlightColor="hsl(137deg 82% 52%)"
      />
      <div className="flex flex-row justify-between h-full">
        <Skeleton
          duration={1}
          containerClassName="flex w-[3px]"
          style={{ display: "flex", width: "3px", height: "42px", rotate: "180deg" }}
          baseColor="hsl(0deg 0% 7%)"
          highlightColor="hsl(137deg 82% 52%)"
        />
        {/* Here should be skeleton that matches actuall UI */}
        <Skeleton
          duration={1}
          containerClassName="flex w-[3px]"
          style={{ display: "flex", width: "3px", height: "42px", rotate: "180deg" }}
          baseColor="hsl(0deg 0% 7%)"
          highlightColor="hsl(137deg 82% 52%)"
        />
      </div>
      <Skeleton
        duration={2}
        containerClassName="flex h-[3px]"
        style={{ display: "flex", rotate: "180deg", height: "3px" }}
        baseColor="hsl(0deg 0% 7%)"
        highlightColor="hsl(137deg 82% 52%)"
      />
    </div>
  )
}
