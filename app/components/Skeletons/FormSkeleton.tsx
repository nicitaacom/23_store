import "react-loading-skeleton/dist/skeleton.css"
import Skeleton from "react-loading-skeleton"

// http://localhost:6006/?path=/story/ui-feedback-toastexample--success-toast
export function FormSkeleton({ count }: { count?: number }) {
  return Array.from({ length: count ?? 1 }, (_, index) => (
    <Skeleton
      key={index}
      baseColor="hsl(var(--foreground))"
      highlightColor="hsl(var(--foreground-accent))"
      width="100%"
      height="40px"
    />
  ))
}
