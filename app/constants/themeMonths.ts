import type { TThemeMonthSchedule } from "@/ts/types/TSiteTheme"

export const THEME_MONTHS = {
  halloween: [10],
  "new-year": [11, 1],
} as const satisfies TThemeMonthSchedule
