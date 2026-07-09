import "react-loading-skeleton/dist/skeleton.css"

import { ProductsSkeleton } from "./InitialPageLoading/ProductsSkeleton"
import { NavbarSkeleton } from "./NavbarSkeleton"

export function InitialPageLoadingSkeleton() {
  return (
    //pr-[17px] - for scrollbar needed - so skeleton looks closer to actual UI
    <div className="inset-0 z-[99] bg-[#121212] h-[100vh] pr-[17px] overflow-hidden" id="initial-loading">
      <NavbarSkeleton />
      <ProductsSkeleton />
    </div>
  )
}
