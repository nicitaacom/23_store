import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"
import { v4 as uuidv4 } from "uuid"

export function ProductsSkeleton({ count }: { count?: number }) {
  return Array(count)
    .fill(0)
    .map(() => {
      const uuid = uuidv4()
      return (
        <div key={uuid}>
          <Skeleton
            className="laptop:h-[200px] h-[clamp(12.5rem,3.5714rem+44.6429vw,25rem)]"
            baseColor="hsl(var(--foreground))"
            highlightColor="hsl(var(--foreground-hover))"
          />
        </div>
      )
    })
}
