"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useOnInView } from "react-intersection-observer"

import { RANGE_SIZE, nextPageStart, previousPageStart } from "@/utils/nearRange"

interface NearRowsProps {
  rows: { id: string; node: ReactNode }[]
  onSpan: (from: number, to: number) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function NearRows({ rows, onSpan }: NearRowsProps) {
  const orderKey = rows.map(row => row.id).join("\0")
  const [appliedKey, setAppliedKey] = useState(orderKey)
  const [start, setStart] = useState(0)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef(0)
  const totalRef = useRef(rows.length)
  const leftTop = useRef(false)
  const scrollMode = useRef<"top" | "bottom" | null>(null)

  if (orderKey !== appliedKey) {
    setAppliedKey(orderKey)
    setStart(0)
  }

  const end = Math.min(rows.length, start + RANGE_SIZE)
  const shown = rows.slice(start, end)

  useEffect(() => {
    onSpan(rows.length === 0 ? 0 : start + 1, end)
  }, [end, onSpan, rows.length, start])

  const bindRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node
    setRoot(current => (current === node ? current : node))
  }, [])

  const headRef = useOnInView(
    inView => {
      if (!inView) {
        leftTop.current = true
        return
      }
      if (!leftTop.current) return
      const scroller = rootRef.current
      if (!scroller || scroller.clientHeight < 80 || scroller.scrollTop > 24) return
      const next = previousPageStart(startRef.current)
      if (next === startRef.current) return
      leftTop.current = true
      scrollMode.current = "bottom"
      setStart(next)
    },
    { root, skip: !root || start === 0 },
  )

  const tailRef = useOnInView(
    inView => {
      if (!inView) return
      const scroller = rootRef.current
      if (!scroller || scroller.clientHeight < 80 || scroller.scrollTop < 24) return
      if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 48) return
      const next = nextPageStart(startRef.current, totalRef.current)
      if (next === startRef.current) return
      leftTop.current = false
      scrollMode.current = "top"
      setStart(next)
    },
    { root, skip: !root || end >= rows.length },
  )

  useLayoutEffect(() => {
    startRef.current = start
    totalRef.current = rows.length
  }, [rows.length, start])

  useLayoutEffect(() => {
    const scroller = rootRef.current
    if (!scroller) return
    if (scrollMode.current === "bottom") scroller.scrollTo({ top: scroller.scrollHeight })
    else scroller.scrollTo({ top: 0 })
    scrollMode.current = null
  }, [appliedKey, start])

  return (
    <div className="catalog-scroll min-h-0 flex-1 overflow-y-auto pr-1" ref={bindRoot}>
      <div className="flex flex-col gap-2">
        <div className="h-px shrink-0" ref={headRef} />
        {shown.map(row => (
          <div key={row.id}>{row.node}</div>
        ))}
        <div className="h-px shrink-0" ref={tailRef} />
      </div>
    </div>
  )
}
