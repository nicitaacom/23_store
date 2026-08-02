export type TSiteTheme = "default" | "halloween" | "new-year"

export type TSeasonalTheme = Exclude<TSiteTheme, "default">

export type TCalendarMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TThemeMonthSchedule = Readonly<Record<TSeasonalTheme, readonly TCalendarMonth[]>>
