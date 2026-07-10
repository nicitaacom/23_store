import { formatTime } from "@/utils/formatTime"
import { getSupportMessageDayLabel, isSupportMessageSameDay } from "@/utils/support/getSupportMessageDayLabel"

// Compact label for a ticket row: today shows the time (16:36), older shows the day (5 Jul / Today).
export function getTicketRowTimeLabel(dateString: string) {
  return isSupportMessageSameDay(dateString, new Date().toISOString())
    ? formatTime(dateString, true)
    : getSupportMessageDayLabel(dateString)
}
