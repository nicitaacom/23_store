import Skeleton from "react-loading-skeleton"
import "react-loading-skeleton/dist/skeleton.css"
import { v4 as uuidv4 } from "uuid"

export function FormSkeleton({ count }: { count?: number }) {
  return Array(count)
    .fill(0)
    .map(() => {
      const uuid = uuidv4()
      return (
        <Skeleton
          key={uuid}
          baseColor="hsl(var(--foreground))"
          highlightColor="backdrop-flter:brightness(75%)"
          style={{ backdropFilter: "brightness(75%)" }}
          width={"100%"}
          height={"40px"}
        />
      )
    })
}
