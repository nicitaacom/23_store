# AI Code Style Guide

Use this as the default style when generating code for this project.
Your (AI) biggest issue right now is not following this - so read this in full and follow code patterns.
DO NOT SKIP. DO NOT RUSH through this.

## All docs

| Doc                                                                       | What it covers                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- | --- |
| [sdk-fetch-api](./code-patterns/sdk-fetch-api.md)                         | SDK class pattern, API route pattern, DB verb naming             |
| [hook-set](./code-patterns/hook-set.md)                                   | Fetch-on-mount hook with skeleton + toast                        |
| [hook-auto-update](./code-patterns/hook-auto-update.md)                   | Debounced autosave hook with dirty check + stale closure fix     |
| [pusher-patterns](./code-patterns/component-related/pusher-patterns.md)   | Pusher channel reuse + unbind-before-bind rule                   |
| [zustand-patterns](./code-patterns/component-related/zustand-patterns.md) | Zustand store shape, selector rule, persist pattern              |     |
| [AI_UI_skill](./AI_UI_skill.md)                                           | Tailwind-only UI rules, tokens, breakpoints, spacing, typography |
| [PROJECT_UI_STYLE](./PROJECT_UI_STYLE.md)                                 | UI philosophy — compact, content-first, flat-vector feel         |
| [public-assets](./public-assets.md)                                       | All public/ images inventory — used vs unused                    |

### Code patterns

[sdk-fetch-api](./code-patterns/sdk-fetch-api.md)

[hook-set](./code-patterns/hook-set.md)
[hook-auto-update](./code-patterns/hook-auto-update.md)

## Code style rules component related

[pusher-patterns](./code-patterns/component-related/pusher-patterns.md)
[zustand-patterns](./code-patterns/component-related/zustand-patterns.md)
[component-rendering-useMemo-isSkeleton-hook-patterns](./code-patterns/component-related/tsx-component-patterns)

## Code style rules

1. Keep code concise and prefer one-liners when readable.
2. Use ternaries where they improve clarity.
3. Prefer early returns.
4. Keep commented lines that already exist.
5. If a function can return an error, return a string error instead of throwing unless the file
   already uses a different pattern.
6. Put `style` first then `className` in HTML tag arguments.
7. Avoid tiny abbreviations like `idx`, `ctx`, `e`, `err`, `v`, `val` use descriptive names like `index`, `context`, `error`, `value`, `item`, `store`.
8. Use `useEffect` only when needed and keep side effects in hooks, not components.
9. Each distinct realtime concern (typing indicator, ticket updates, message updates, etc.) must
   live in its own hook file. Do not merge multiple Pusher event groups into one hook or one
   component `useEffect`.
10. NEVER export types from client or server components. They should be exported from a separated `typeName.ts` file.
11. NEVER export const with classNames
12. NEVVER use `localstorage.setItem` or `localstorage.getItem` - use zustand store persist instead

## General architecture

DB verbs:

- `selectDB`
- `insertDB`
- `updateDB`
- `deleteDB`

## Fundamental workflow

### At the beginning

1. Validation
2. Rate limit
3. Auth
4. Support

### In the middle

1. Architecture planning
2. Data flow (optimistic updates)
3. State boundaries

### At the end

1. Split code into components, hooks, and helper functions
2. Ask AI to validate after each major step
3. Create docs for what was built

### Component rules

- Keep component state local only when it is truly UI-only.
- Avoid component `useEffect` when a hook can own the logic.
- Keep loading state separated by scope:
  - `isSkeleton` for initial full-screen or full-card loading
  - `isLoading` for single action buttons
  - `isLocalLoading` for single loading state (not block all UI)
  - global `isLoading` or `mountingStep` for app-level boot logic

### Hook rules

- Hook owns side effects.
- Hook owns fetches.
- Hook owns optimistic updates.
- Hook owns rollback logic.
- Hook returns only what the component needs.
- Use `useMemo` for derived maps and expensive computed data.
- Use `useCallback` for action functions exposed to components.

### Standard hook shape

```ts
Component
  └── useSetXxx()
        ├── fetchFn
        ├── autoUpsertFn
        ├── autoUpsertRef
        ├── hasFetchedRef
        ├── serverUpdateRef
        └── lastSavedRef
```

### Skeleton vs loading vs status

| state          | use               | example                                      |
| -------------- | ----------------- | -------------------------------------------- |
| `isSkeleton`   | initial load      | shimmer for list or card                     |
| `isLoading`    | one button/action | disable a single button                      |
| `currentState` | status badge      | `"fetching"` / `"updating"` / `"up to date"` |

## Zustand store pattern

Use Zustand for UI and app state.

```ts
import { create } from "zustand"

type Store = {
  value: string
  setValue: (value: string) => void
}

export const useStore = create<Store>(set => ({
  value: "",
  setValue: value => set({ value }),
}))
```

### Store rules

- Keep action names full and clear.
- Destructure store functions in hooks and components.
- Prefer direct state updates.
- Avoid callback-style setters that behave like `useState`.
- Keep server sync logic outside the store unless the store is specifically for UI state.

### Store action style

```ts
setValue: value => set({ value })
```

Prefer this:

```ts
setSettings({ ...settings, enabled: true })
```

Not this:

```ts
setSettings(prev => ({ ...prev, enabled: true }))
```

## Debounce watcher pattern

Use this pattern for auto-save.

```ts
const autoUpsertRef = useRef(autoUpsertFn)

useEffect(() => {
  autoUpsertRef.current = autoUpsertFn
}, [autoUpsertFn])

useEffect(() => {
  if (!hasFetchedRef.current) return
  if (serverUpdateRef.current) {
    serverUpdateRef.current = false
    return
  }
  const timer = setTimeout(() => autoUpsertRef.current(), 600)
  return () => clearTimeout(timer)
}, [settings])
```

### Why this pattern exists

- `autoUpsertRef` prevents re-registering debounce on every render.
- `hasFetchedRef` blocks watchers before first data load.
- `serverUpdateRef` prevents feedback loops after server-driven updates.

## Optimistic update + rollback

```ts
const prev = lastSavedRef.current

try {
  const response = await sdk.method(encryptedEnvsClient, payload)
  if (typeof response === "string") throw Error(response)
  lastSavedRef.current = cloneDeep(response)
  serverUpdateRef.current = true
  setSettings(response)
} catch (error) {
  serverUpdateRef.current = true
  setSettings(prev)
  toast.show("error", "...", error instanceof Error ? error.message : String(error))
}
```

### Rollback rules

- Save a clone of the last known good state.
- Roll back to the snapshot on error.
- Keep the `serverUpdateRef` guard active during rollback.
- Convert unknown errors to string safely.

## SDK instantiation

| approach                         | use when                               |
| -------------------------------- | -------------------------------------- |
| `useMemo(() => new MySDK(), [])` | SDK has internal state or is expensive |
| `new MySDK()` outside component  | SDK is stateless and cheap             |

Rule:

- If the class is stateless and simple, create it outside React.
- If unsure, use `useMemo`.

## Server action pattern

Server actions should validate, call the DB, and return `string` on error.

```ts
"use server"

import { getSupabaseServerSDK } from "@/utils/getSupabaseServerSDK"
import type { TSchedules } from "../types/TSchedules"

export async function selectDBSchedulesPickerAction(encryptedEnvsClient: string[]): Promise<TSchedules[] | string> {
  // 1. get supabase instance
  const supabaseServer = await getSupabaseServerSDK(encryptedEnvsClient)
  if (typeof supabaseServer === "string") return supabaseServer

  // 2. fetch data
  const { data, error } = await supabaseServer().from("schedules").select("*").order("created_at", { ascending: false })

  // 3. handle error
  if (error) return error.message
  if (!data) return []
  if (!Array.isArray(data)) return "Invalid schedules response format"

  return data as TSchedules[]
}
```

### Server action rules

- Return `string` for errors.
- Return typed data on success.
- Validate response shape before casting.
- Keep server-only utilities in server files.
- Use `typeof result === "string"` checks at call sites.

## Route handler pattern

API routes should validate input and convert action output into API responses.

```ts
import { NextResponse } from "next/server"
import { aiPrettifyMessage } from "./aiPrettifyMessage"

export async function POST(req: Request) {
  const { encryptedEnvsClient, message, provider, model, userInstructions } = (await req.json()) as API.AIPrettifyMessageRequest

  if (!encryptedEnvsClient?.length) return NextResponse.json({ error: "encryptedEnvsClient missing" }, { status: 400 })
  if (!message) return NextResponse.json({ error: "message missing" }, { status: 400 })
  if (!provider || !model) return NextResponse.json({ error: "provider or model missing" }, { status: 400 })

  const result = await aiPrettifyMessage(encryptedEnvsClient, message, provider, model, userInstructions ?? "")
  return typeof result === "string"
    ? NextResponse.json({ error: result } as API.AIPrettifyMessageResponse, { status: 400 })
    : NextResponse.json({ aiResponse: result.aiResponse } as API.AIPrettifyMessageResponse, { status: 200 })
}
```

### Route rules

- Validate required fields first.
- Keep response shapes typed.
- Return `400` for user input problems.
- Return `200` for success.
- Keep the route thin and move logic into helper functions.

## `api.d.ts` pattern

Use module augmentation for shared request and response types.

```ts
declare module API {
  type ExampleRequest = {
    encryptedEnvsClient: string[]
    message: string
  }

  type ExampleResponse = { data: string } | { error: string }
}
```

### Rules

- Keep request and response types near the API folder they belong to.
- Use unions for success vs error.
- Keep optional fields explicit.
- Avoid anonymous loose shapes in route handlers.

## AI helper pattern

AI helpers should be explicit, predictable, and safe.

```ts
export async function aiPrettifyMessage(
  encryptedEnvsClient: string[],
  message: string,
  provider: TAIModel,
  model: string,
  userInstructions: string,
): Promise<{ aiResponse: string } | string> {
  // 1. decrypt envs
  const decryptedEnvsClient = await decryptEEC(encryptedEnvsClient)
  if (typeof decryptedEnvsClient === "string") return decryptEnvsClientError(decryptedEnvsClient)

  // 2. read credentials
  // 3. decrypt provider key
  // 4. build prompt
  // 5. call provider
  // 6. return formatted result
}
```

### AI helper rules

- Keep provider-specific differences contained.
- Use a shared endpoint map when possible.
- Build prompts from small clear parts.
- Return only the final result object or error string.
- Avoid extra explanation in the returned AI output.

## Lists, maps, and derived data

Use `useMemo` for derived structures like maps, lookup tables, and booleans computed from arrays.

```ts
const isAllDayMap = useMemo(
  () =>
    Object.fromEntries(
      schedules.map(schedule => [
        schedule.id,
        DAYS.every(day => {
          const slots = schedule.schedule[day]
          return slots?.length === 1 && slots[0][0] === 0 && slots[0][1] === 24
        }),
      ]),
    ),
  [schedules],
)
```

### Rules

- Use memoization for derived data that depends only on existing state.
- Keep derived data out of Zustand unless it must be stored.
- Use readable names like `isAllDayMap`, `dropdownStates`, `newTimeSlots`.

## Time slot and schedule rules

- Prefer `null` over empty strings where the absence of a value matters.
- Guard invalid state before mutation.
- Merge overlapping time slots when needed.
- Handle overnight ranges explicitly.
- Reset temporary UI inputs after successful add.

Example:

```ts
if (!temp.from || !temp.to) return schedule
const from = Number(temp.from)
const to = Number(temp.to)
if (isNaN(from) || isNaN(to)) return schedule
```

## Error handling rules

- Check returned strings from server actions and SDK helpers.
- Convert unknown errors into readable strings.
- Set error state once and keep it visible in the UI.
- Do not hide failures silently.

Pattern:

```ts
catch (error) {
  setErrorMessage(error instanceof Error ? error.message : String(error))
}
```

## Preferred file structure

```txt
components/
hooks/
store/
actions/
types/
consts/
utils/
classes/
```

## When generating new code

AI should follow these steps:

1. Match the existing naming style.
2. Keep functions small and focused.
3. Use the same state pattern already used in the app.
4. Use TS types everywhere.
5. Keep UI compact.
6. Return string errors from server-side helpers.
7. Keep side effects in hooks.
8. Use `twMerge` for conditional Tailwind classes.
9. Put `className` first in TSX props.
10. Prefer the smallest possible change that fits the pattern.

## Example checklist for AI-generated code

Before returning code, verify that it:

- uses concise structure
- keeps `className` first
- uses descriptive variable names
- returns string errors where needed
- keeps hooks in charge of side effects
- keeps components thin
- uses `useMemo` and `useCallback` where appropriate
- follows the store/action separation
- matches the project’s minimal UI style

## Notes

- This guide is optimized for code that should look like your current codebase.
- If a pattern is already established in the surrounding file, keep it.
- Prefer consistency over novelty.
- Avoid introducing new abstractions unless they reduce complexity.
- Use <Image/> component from "next/image" for better prformance - pass props `alt` `src` `width` `height` `sizes`
- follow this order of props - style is ALWAYS comes first - then className - then rest

## Example: compact helper style

```ts
const scrollToFocusedItem = (
  hour: number,
  activeDropdown: { day: string; type: string } | null,
  refs: React.RefObject<Record<string, HTMLDivElement | null>>,
) => {
  if (!activeDropdown) return
  const container = refs.current[`${activeDropdown.day}-${activeDropdown.type}`]
  ;(container?.children[hour] as HTMLElement)?.scrollIntoView({ block: "nearest" })
}
```

## Example: compact action style

```ts
export const setFocusedIndex = (index: number) => set({ focusedIndex: index })
```

## Example: compact TSX props style

```tsx
<input className="flex-1 px-2 py-1.5 text-sm rounded-md" value={value} onChange={onChange} />
```
