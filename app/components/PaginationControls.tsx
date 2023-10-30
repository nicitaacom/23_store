import Link from "next/link"
import React from "react"
import { FC } from "react"

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
    <div className="flex gap-2">
      <Link
        className={`bg-blue-500 text-white p-1 ${!hasPrevPage ? "pointer-events-none" : ""}`}
        href={`/?page=${currentPage - 1}&per_page=${perPage}`}>
        prev page
      </Link>

      <div>
        {currentPage} / {totalPages}
      </div>

      <Link
        className={`bg-blue-500 text-white p-1 ${!hasNextPage ? "pointer-events-none" : ""}`}
        href={`/?page=${currentPage + 1}&per_page=${perPage}`}>
        next page
      </Link>
    </div>
  )
}

export default PaginationControls
