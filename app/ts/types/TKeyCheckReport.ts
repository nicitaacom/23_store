/**
 * What `runKeyChecks` in `app/utils/checkKeys.ts` answers with. The webhook writes this into Redis
 * under `keys-check:last-report` and compares `failures` against the previous run, so the same
 * broken key stays quiet instead of sending a message every week.
 */
export type TKeyCheckReport = {
  ok: boolean
  failures: { name: string; reason: string; tier: "live" | "shape" | "skip" }[]
  liveCount: number
  shapeCount: number
  skipCount: number
  ranAt: string
}
