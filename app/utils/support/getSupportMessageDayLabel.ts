function isSameDay(left: string, right: string) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

export function getSupportMessageDayLabel(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()

  if (isSameDay(dateString, today.toISOString())) {
    return "Today"
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date)
}

export const isSupportMessageSameDay = isSameDay
