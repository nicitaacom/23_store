import { FC } from "react"
import { Button } from "./ui"
import { BiSkipPrevious, BiSkipNext } from "react-icons/bi"

interface PaginationControlsProps {
  hasNextPage: boolean
  hasPrevPage: boolean
  currentPage: number
  totalPages: number
  perPage: number
  basePath: string
  query?: string
}

const PaginationControls: FC<PaginationControlsProps> = ({
  hasNextPage,
  hasPrevPage,
  currentPage,
  totalPages,
  perPage,
  basePath,
  query,
}) => {
  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      perPage: String(perPage),
    })

    if (query?.trim()) {
      params.set("query", query.trim())
    }

    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="flex flex-row gap-x-3 justify-center items-center bg-background/50 backdrop-blur-sm border border-success/20 rounded-lg p-2">
      <Button
        variant="default-outline"
        className={`border-success/30 hover:border-success hover:bg-success/10 ${!hasPrevPage ? "pointer-events-none opacity-30" : ""}`}
        href={hasPrevPage ? createPageHref(currentPage - 1) : undefined}>
        <BiSkipPrevious size={24} className="text-success" />
      </Button>

      <div className="px-4 py-2 bg-success/10 border border-success/30 rounded text-title font-semibold min-w-[80px] text-center">
        {currentPage} / {totalPages}
      </div>

      <Button
        variant="default-outline"
        className={`border-success/30 hover:border-success hover:bg-success/10 ${!hasNextPage ? "pointer-events-none opacity-30" : ""}`}
        href={hasNextPage ? createPageHref(currentPage + 1) : undefined}>
        <BiSkipNext size={24} className="text-success" />
      </Button>
    </div>
  )
}

export default PaginationControls
