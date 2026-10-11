"use client"

import { useEffect, useState } from "react"

import { getBackupTransferTime } from "../functions/formatBackupTransfer"

export function useBackupTransferTime(startedAt: number | null, finishedAt: number | null, bytesDone: number,
  bytesTotal: number, speedBytesPerMs: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [startedAt, finishedAt])
  return getBackupTransferTime(startedAt, finishedAt, now, bytesDone, bytesTotal, speedBytesPerMs)
}
