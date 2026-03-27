"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface LazyLoadingConfig<T> {
  step: number
  windowSize: number
  fetchFunction: (start: number, end: number) => Promise<T[]>
  currentState: T[]
  setState: (data: T[]) => void
  isInitialStateLoading?: boolean
  resetKey?: string
}

export type LazyWindow = { startIndex: number; endIndex: number }

interface LazyLoadingReturn {
  isFetching: boolean
  hasNoMoreDataToFetch: boolean
  currentWindow: LazyWindow
  topRef: (node: Element | null) => void
  bottomRef: (node: Element | null) => void
  bottomInView: boolean
}

export const useLazyLoading = <T extends { id: string }>({
  step,
  windowSize,
  fetchFunction,
  currentState,
  setState,
  isInitialStateLoading: isInitialLoading = false,
  resetKey,
}: LazyLoadingConfig<T>): LazyLoadingReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [currentWindow, setCurrentWindow] = useState<LazyWindow>({ startIndex: 0, endIndex: windowSize })
  const [hasNoMoreDataToFetch, setHasNoMoreDataToFetch] = useState(false)
  const [hasReachedStart, setHasReachedStart] = useState(false)
  const [topNode, setTopNode] = useState<Element | null>(null)
  const [bottomNode, setBottomNode] = useState<Element | null>(null)
  const [topInView, setTopInView] = useState(false)
  const [bottomInView, setBottomInView] = useState(false)
  const highestFetched = useRef(currentState.length)
  const currentStateRef = useRef<T[]>(currentState)

  useEffect(() => {
    currentStateRef.current = currentState
    highestFetched.current = Math.max(highestFetched.current, currentState.length)
  }, [currentState])

  useEffect(() => {
    setIsLoading(false)
    setCurrentWindow({ startIndex: 0, endIndex: windowSize })
    setHasNoMoreDataToFetch(false)
    setHasReachedStart(false)
    highestFetched.current = currentStateRef.current.length
  }, [resetKey, windowSize])

  useEffect(() => setHasReachedStart(currentWindow.startIndex === 0), [currentWindow.startIndex])

  useEffect(() => {
    if (!topNode) return

    const observer = new IntersectionObserver(([entry]) => setTopInView(entry.isIntersecting), {
      rootMargin: "300px 0px 0px 0px",
      threshold: 0,
    })

    observer.observe(topNode)
    return () => observer.disconnect()
  }, [topNode])

  useEffect(() => {
    if (!bottomNode) return

    const observer = new IntersectionObserver(([entry]) => setBottomInView(entry.isIntersecting), {
      rootMargin: "0px 0px 300px 0px",
      threshold: 0,
    })

    observer.observe(bottomNode)
    return () => observer.disconnect()
  }, [bottomNode])

  const fetchDataForRange = useCallback(
    async (start: number, end: number) => {
      if (isInitialLoading || isLoading) return

      try {
        setIsLoading(true)
        const fetchedData = await fetchFunction(start, end)

        if (fetchedData.length) {
          highestFetched.current = Math.max(highestFetched.current, start + fetchedData.length)
        }

        if (fetchedData.length === 0 || fetchedData.length < end - start) {
          setHasNoMoreDataToFetch(true)
        }

        const existingIds = new Set((currentStateRef.current || []).map(item => item.id))
        const uniqueNewData = fetchedData.filter(item => !existingIds.has(item.id))
        if (!uniqueNewData.length) return

        setState([...(currentStateRef.current || []), ...uniqueNewData])
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchFunction, isInitialLoading, isLoading, setState],
  )

  useEffect(() => {
    if (isInitialLoading || isLoading || currentState.length > 0 || hasNoMoreDataToFetch) return
    fetchDataForRange(0, step)
  }, [currentState.length, fetchDataForRange, hasNoMoreDataToFetch, isInitialLoading, isLoading, step])

  useEffect(() => {
    if (!bottomInView || isLoading || hasNoMoreDataToFetch) return
    if (currentState.length === 0 && highestFetched.current === 0) return

    const nextFetchStart = highestFetched.current
    const nextFetchEnd = nextFetchStart + step
    const newWindowStart = Math.max(0, nextFetchStart - (windowSize - step))
    const newWindowEnd = nextFetchStart + step

    setCurrentWindow({ startIndex: newWindowStart, endIndex: newWindowEnd })
    fetchDataForRange(nextFetchStart, nextFetchEnd)
  }, [bottomInView, currentState.length, fetchDataForRange, hasNoMoreDataToFetch, isLoading, step, windowSize])

  useEffect(() => {
    if (!topInView || isLoading || hasReachedStart || currentWindow.startIndex <= 0) return

    const previousFetchEnd = currentWindow.startIndex
    const previousFetchStart = Math.max(0, previousFetchEnd - step)
    if (previousFetchStart === previousFetchEnd) {
      setHasReachedStart(true)
      return
    }

    const newWindowStart = previousFetchStart
    const newWindowEnd = Math.min(currentWindow.endIndex, newWindowStart + windowSize)
    setCurrentWindow({ startIndex: newWindowStart, endIndex: newWindowEnd })
  }, [currentWindow.endIndex, currentWindow.startIndex, hasReachedStart, isLoading, step, topInView, windowSize])

  return {
    isFetching: isLoading,
    hasNoMoreDataToFetch,
    currentWindow,
    topRef: setTopNode,
    bottomRef: setBottomNode,
    bottomInView,
  }
}
