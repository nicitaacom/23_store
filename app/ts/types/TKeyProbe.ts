/**
 * One entry in the registry of `app/utils/checkKeys.ts` - one name declared in `env.d.ts`.
 *
 * `presence` is not a tier: every entry is checked for a present, non-empty value first, and `check`
 * only runs after that passes.
 *
 *   live  - a request to the service proves the key works right now
 *   shape - no service to ask, so `check` reads the value's own format (length, prefix, hex)
 *   skip  - nothing beyond presence
 */
export type TKeyProbe = {
  name: string
  tier: "live" | "shape" | "skip"
  /**
   * The name of the variable the app reads instead when this one is empty, for a pair where the code
   * takes either. An empty value passes while the partner holds one, and both empty fails on both.
   * Only for a fallback the code really has - see `getPineconeHost` in `app/libs/ai/chatMemory.ts`.
   */
  optionalWhen?: string
  /** Returns null when the key is good, or a short reason naming what the service answered. */
  check?: (value: string) => Promise<string | null> | string | null
}
