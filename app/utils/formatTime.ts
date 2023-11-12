export function formatTime(dateString: string, hideTimezone?: boolean): string {
  const date = new Date(dateString)

  // Get the user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezoneOffset = date.getTimezoneOffset() / 60 // Get the timezone offset in hours

  // Adjust the time based on the timezone offset
  date.setHours(date.getHours() + timezoneOffset)

  const hours = date.getHours().toString().padStart(2, "0") // Get hours in 2-digit format
  const minutes = date.getMinutes().toString().padStart(2, "0") // Get minutes in 2-digit format
  if (hideTimezone) {
    return `${hours}:${minutes}`
  } else {
    return `${hours}:${minutes} (${userTimezone})`
  }
}
