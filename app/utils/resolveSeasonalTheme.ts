import type { TSeasonalTheme, TSiteTheme, TThemeMonthSchedule } from "@/ts/types/TSiteTheme"
import { THEME_MONTHS } from "@/constants/themeMonths"

export const DEFAULT_THEME: TSiteTheme = "default"

export function resolveSeasonalTheme(month: number, schedule: TThemeMonthSchedule = THEME_MONTHS): TSiteTheme {
  if (!Number.isInteger(month) || month < 1 || month > 12) return DEFAULT_THEME

  const matchingThemes = (Object.entries(schedule) as [TSeasonalTheme, TThemeMonthSchedule[TSeasonalTheme]][]).filter(
    ([, months]) => months.some(configuredMonth => configuredMonth === month),
  )

  return matchingThemes.length === 1 ? matchingThemes[0][0] : DEFAULT_THEME
}
