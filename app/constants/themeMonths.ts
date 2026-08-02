import type { TThemeMonthSchedule } from "@/ts/types/TSiteTheme"

export const THEME_MONTHS = {
  halloween: [11],
  "new-year": [12, 1],
} as const satisfies TThemeMonthSchedule
