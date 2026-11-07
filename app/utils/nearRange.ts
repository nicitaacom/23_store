export const RANGE_SIZE = 40

export function nextPageStart(start: number, total: number) {
  const next = start + RANGE_SIZE
  return next >= total ? start : next
}

export function previousPageStart(start: number) {
  return Math.max(0, start - RANGE_SIZE)
}
