"use client"

import React, { useEffect, useRef, useState } from "react"

import { useScopedI18n } from "@/locales/client"

interface TimerProps {
  seconds: number
  children?: React.ReactNode
  label?: string
  labelClassName?: string
  action?: () => void
}

// http://localhost:6006/?path=/story/authentication-authexample--sign-in
export function Timer({ seconds, children, label, labelClassName, action }: TimerProps) {
  const t = useScopedI18n("common")
  const [countDown, setCountDown] = useState(seconds)
  const timerRef = useRef<NodeJS.Timeout | undefined>()
  const isChildren = countDown <= 0

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountDown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (countDown <= 0) {
      clearInterval(timerRef.current)
      if (action) {
        action()
      }
    }
  }, [countDown, action])

  return (
    <span className="flex">
      {!isChildren && (
        <>
          <label className={labelClassName}>
            {label}&nbsp;{t("seconds_short", { count: countDown })}
          </label>
        </>
      )}
      {isChildren && children}
    </span>
  )
}
