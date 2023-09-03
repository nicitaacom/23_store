import React, { useEffect, useRef, useState } from "react"

interface TimerProps {
  seconds: number
  children?: React.ReactNode
  label?: string
}

export function Timer({ seconds, children, label }: TimerProps) {
  const [countDown, setCountDown] = useState(seconds)
  const timerRef = useRef<NodeJS.Timeout | undefined>()
  const [isChildren, setIsChildren] = useState(false)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountDown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (countDown <= 0) {
      clearInterval(timerRef.current)
      setIsChildren(true)
    }
  }, [countDown])

  return (
    <div className="flex">
      {!isChildren && (
        <>
          {label}&nbsp;
          <h1>{countDown}s</h1>
        </>
      )}
      {isChildren && children}
    </div>
  )
}
