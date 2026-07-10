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

export type TLazyWindow = { startIndex: number; endIndex: number }

interface LazyLoadingReturn {
  isFetching: boolean
  hasNoMoreDataToFetch: boolean
  currentWindow: TLazyWindow
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
  const [currentWindow, setCurrentWindow] = useState<TLazyWindow>({ startIndex: 0, endIndex: windowSize })
  const [hasNoMoreDataToFetch, setHasNoMoreDataToFetch] = useState(false)
  const [hasReachedStart, setHasReachedStart] = useState(false)
  const [topNode, setTopNode] = useState<Element | null>(null)
  const [bottomNode, setBottomNode] = useState<Element | null>(null)
  const [topInView, setTopInView] = useState(false)
  const [bottomInView, setBottomInView] = useState(false)
  const highestFetched = useRef(currentState.length)
  const currentStateRef = useRef<T[]>(currentState)
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  const [prevResetWindowSize, setPrevResetWindowSize] = useState(windowSize)
  const [prevWindowStartIndex, setPrevWindowStartIndex] = useState(currentWindow.startIndex)

  useEffect(() => {
    currentStateRef.current = currentState
    highestFetched.current = Math.max(highestFetched.current, currentState.length)
  }, [currentState])

  if (resetKey !== prevResetKey || windowSize !== prevResetWindowSize) {
    setPrevResetKey(resetKey)
    setPrevResetWindowSize(windowSize)
    setIsLoading(false)
    setCurrentWindow({ startIndex: 0, endIndex: windowSize })
    setHasNoMoreDataToFetch(false)
    setHasReachedStart(false)
  }

  useEffect(() => {
    highestFetched.current = currentStateRef.current.length
  }, [resetKey, windowSize])

  if (currentWindow.startIndex !== prevWindowStartIndex) {
    setPrevWindowStartIndex(currentWindow.startIndex)
    setHasReachedStart(currentWindow.startIndex === 0)
  }

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

  // eslint-disable-next-line local-rules/sdk-method-naming -- generic pass-through wrapper around the caller-supplied fetchFunction, not a DB/Redis read itself
  const fetchDataForRange = useCallback(
    async (start: number, end: number) => {
      if (isInitialLoading || isLoading) return

      try {
        setIsLoading(true)
        const fetchFunctionResp = await fetchFunction(start, end)

        if (fetchFunctionResp.length) {
          highestFetched.current = Math.max(highestFetched.current, start + fetchFunctionResp.length)
        }

        if (fetchFunctionResp.length === 0 || fetchFunctionResp.length < end - start) {
          setHasNoMoreDataToFetch(true)
        }

        const existingIds = new Set((currentStateRef.current || []).map(item => item.id))
        const uniqueNewData = fetchFunctionResp.filter(item => !existingIds.has(item.id))
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
  // eslint-disable-next-line local-rules/sdk-method-naming -- generic pass-through wrapper around the caller-supplied fetchFunction, not a DB/Redis read itself
  const fetchDataForRangeRef = useRef(fetchDataForRange)
  useEffect(() => {
    fetchDataForRangeRef.current = fetchDataForRange
  })

  useEffect(() => {
    if (isInitialLoading || isLoading || currentState.length > 0 || hasNoMoreDataToFetch) return
    void Promise.resolve().then(() => fetchDataForRangeRef.current(0, step))
  }, [currentState.length, hasNoMoreDataToFetch, isInitialLoading, isLoading, step])

  useEffect(() => {
    if (!bottomInView || isLoading || hasNoMoreDataToFetch) return
    if (currentState.length === 0 && highestFetched.current === 0) return

    const nextFetchStart = highestFetched.current
    const nextFetchEnd = nextFetchStart + step
    const newWindowStart = Math.max(0, nextFetchStart - (windowSize - step))
    const newWindowEnd = nextFetchStart + step

    void Promise.resolve().then(() => {
      setCurrentWindow({ startIndex: newWindowStart, endIndex: newWindowEnd })
      fetchDataForRangeRef.current(nextFetchStart, nextFetchEnd)
    })
  }, [bottomInView, currentState.length, hasNoMoreDataToFetch, isLoading, step, windowSize])

  useEffect(() => {
    if (!topInView || isLoading || hasReachedStart || currentWindow.startIndex <= 0) return

    const previousFetchEnd = currentWindow.startIndex
    const previousFetchStart = Math.max(0, previousFetchEnd - step)

    void Promise.resolve().then(() => {
      if (previousFetchStart === previousFetchEnd) {
        setHasReachedStart(true)
        return
      }

      const newWindowStart = previousFetchStart
      const newWindowEnd = Math.min(currentWindow.endIndex, newWindowStart + windowSize)
      setCurrentWindow({ startIndex: newWindowStart, endIndex: newWindowEnd })
    })
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
