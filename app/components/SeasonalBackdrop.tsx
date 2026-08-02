"use client"

import { HalloweenScene } from "@/components/Halloween/HalloweenScene"
import { NewYearScene } from "@/components/NewYear/NewYearScene"

/* One fixed layer behind the whole page. Each scene returns null unless its own theme is on, so
   only one of them ever paints and the default theme paints nothing at all. */
// http://localhost:6006/?path=/story/foundations-design-tokens--colors
export function SeasonalBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-[0] z-0 overflow-hidden" aria-hidden="true">
      <HalloweenScene />
      <NewYearScene />
    </div>
  )
}
