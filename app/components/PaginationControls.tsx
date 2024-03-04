import React from "react"
import { FC } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "./ui"
import { BiSkipPrevious, BiSkipNext } from "react-icons/bi"

interface PaginationControlsProps {
  hasNextPage: boolean
  hasPrevPage: boolean
  currentPage: number
  totalPages: number
  perPage: number
}

const PaginationControls: FC<PaginationControlsProps> = ({
  hasNextPage,
  hasPrevPage,
  currentPage,
  totalPages,
  perPage,
}) => {
  return (
    <div className="flex flex-row gap-x-4 justify-center items-center">
      <Button
        variant="default-outline"
        className={`border-border-color ${!hasPrevPage ? "pointer-events-none opacity-50" : ""}`}
        href={`/?page=${currentPage - 1}&perPage=${perPage}`}>
        <BiSkipPrevious size={32} />
      </Button>

      <div>
        {currentPage} / {totalPages}
      </div>

      <Button
        variant="default-outline"
        className={`border-border-color ${!hasNextPage ? "pointer-events-none opacity-50" : ""}`}
        href={`/?page=${currentPage + 1}&perPage=${perPage}`}>
        <BiSkipNext size={32} />
      </Button>
    </div>
  )
}

export default PaginationControls
