"use client"

import { useEffect } from "react"

import { trackBuyingFlowEvent } from "@/utils/trackBuyingFlowEvent"

interface SearchTrackerProps {
  query: string
  resultsCount: number
}

export function SearchTracker({ query, resultsCount }: SearchTrackerProps) {
  useEffect(() => {
    trackBuyingFlowEvent({ event: "search", searchQuery: query, resultsCount })
  }, [query, resultsCount])

  return null
}
