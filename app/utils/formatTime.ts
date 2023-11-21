export function formatTime(dateString: string, hideTimezone?: boolean): string {
  const date = new Date(dateString)

  // Get the user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const currentDate = new Date() // Current date

  // Check if the date is today
  if (
    date.getDate() === currentDate.getDate() &&
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear()
  ) {
    const hours = date.getHours().toString().padStart(2, "0") // Get hours in 2-digit format
    const minutes = date.getMinutes().toString().padStart(2, "0") // Get minutes in 2-digit format

    if (hideTimezone) {
      return `${hours}:${minutes}`
    } else {
      return `${hours}:${minutes} (${userTimezone})`
    }
  }

  // Check if the date is yesterday
  const yesterday = new Date(currentDate)
  yesterday.setDate(currentDate.getDate() - 1)

  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    const hours = date.getHours().toString().padStart(2, "0") // Get hours in 2-digit format
    const minutes = date.getMinutes().toString().padStart(2, "0") // Get minutes in 2-digit format

    if (hideTimezone) {
      return `Yesterday at ${hours}:${minutes}`
    } else {
      return `Yesterday at ${hours}:${minutes} (${userTimezone})`
    }
  }

  // For dates older than yesterday
  const day = date.getDate().toString().padStart(2, "0") // Get day in 2-digit format
  const month = (date.getMonth() + 1).toString().padStart(2, "0") // Get month in 2-digit format
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, "0") // Get hours in 2-digit format
  const minutes = date.getMinutes().toString().padStart(2, "0") // Get minutes in 2-digit format

  if (hideTimezone) {
    return `${day}.${month}.${year} at ${hours}:${minutes}`
  } else {
    return `${day}.${month}.${year} at ${hours}:${minutes} (${userTimezone})`
  }
}
