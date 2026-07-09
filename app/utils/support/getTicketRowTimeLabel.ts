import { getSupportMessageDayLabel, isSupportMessageSameDay } from "@/utils/support/getSupportMessageDayLabel"
import { formatTime } from "@/utils/formatTime"

// Compact label for a ticket row: today shows the time (16:36), older shows the day (5 Jul / Today).
export const getTicketRowTimeLabel = (dateString: string) =>
  isSupportMessageSameDay(dateString, new Date().toISOString())
    ? formatTime(dateString, true)
    : getSupportMessageDayLabel(dateString)
