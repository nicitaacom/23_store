/** Application storage policy. GB uses decimal bytes; credentials remain server-side. */
export const r2Config = {
  totalForAllUsersGB: 10,
  totalGBUsedWarnPercentage: 80,
  perUserGB: 1,
  gbPerMonthPrice: 0.3,
} as const
