1. Bad - SDK - terminology

```ts
 settings = {
    async fetch(encryptedEnvsClient: string[]): Promise<string | API.SelectReplySettingsResponse> {
```

```ts
  const saveFn = useCallback(async () => {
```

Good - SDK - terminology

```ts
 settings = {
    async select(encryptedEnvsClient: string[]): Promise<string | API.SelectReplySettingsResponse> {
```

```ts
  const handleUpdateDB = useCallback(async () => {
```

2. Bad - hook - terminology

```ts
      const [settingsResult, domainResult] = await Promise.all([

```

Good - SDK - terminology

```ts
      const [settingsResponse, domainResponse] = await Promise.all([
        // OR (in order to be 1 liner - also acceptable)
      const [settingsResp, domainResp] = await Promise.all([
```

3. Good - SDK - code-pattern

```ts
    async select(encryptedEnvsClient: string[]): Promise<string | API.SelectReplySettingsResponse> {
      const resp = await fetch("/api/ai-decisions/manage-emails/reply/select-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedEnvsClient } satisfies API.SelectReplySettingsRequest),
      })
      const respJson: API.SelectReplySettingsResponse = await resp.json()
      if ("error" in respJson) return respJson.error
      return respJson
    },
```

Good - SDK - code-pattern

If API route returns only 1 object e.g `{settings:TypeHere[]}` then just return this type

```ts
   async select(
      encryptedEnvsClient: string[],
    ): Promise<string | Exclude<API.SelectReplySettingsResponse, { error: string }>["settings"]> {
      const resp = await fetch("/api/ai-decisions/manage-emails/reply/select-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedEnvsClient } satisfies API.SelectReplySettingsRequest),
      })
      const respJson: API.SelectReplySettingsResponse = await resp.json()
      if ("error" in respJson) return respJson.error
      return respJson.settings
    },

```

4. Bad - api.d.ts - TypeScript

```ts
type DeclineReplyDecisionResponse = Record<string, never> | { error: string }
```

Good - api.d.ts - TypeScript

```ts
type DeclineReplyDecisionResponse = { success: true } | { error: string }
```

And note if API route just returns `success:true` then in SDK return void on success

```ts
    async updateForDomain(encryptedEnvsClient: string[], domain: string, settingId: string): Promise<string | void> {
```

5. Bad - no 1 letter or vague - anywhere

```ts
const active = settingsResponse.find(s => s.id === activeId) ?? null
// or
const lastIdx = arr[arr.length - 1]
```

Good - no 1 letter or vague - anywhere

```ts
const activeSetting = settingsResponse.find(setting => setting.id === activeId) ?? null
// or
const lastScrapedLead = arr[arr.length - 1]
```

6. Bad - no throwaway const alias

```ts
const activeSettingId = domainResponse
const activeSetting = settingsResponse.find(setting => setting.id === activeSettingId) ?? null
```

Good - no throwaway const alias

```ts
const activeSetting = settingsResponse.find(setting => setting.id === domainResponse) ?? null
```

You don't need to create a const to use a const - if a value already has a usable name and is only
read once, use it directly instead of rebinding it under a new name.

7. Bad - hook-call order inside a hook

```ts
export const useSetAIRepliesDecisionsSettings = () => {
  const { encryptedEnvsClient } = useEnvs()
  const { selectedEA } = useAccountsStore()
  const { setActiveSetting, settings, setSettings } = useAIRepliesDecisions()
  const toast = useToast()
```

Good - hook-call order inside a hook

```ts
export const useSetAIRepliesDecisionsSettings = () => {
  const toast = useToast()
  const { encryptedEnvsClient } = useEnvs()
  const { selectedEA } = useAccountsStore()
  const { setActiveSetting, settings, setSettings } = useAIRepliesDecisions()
```

`toast`/error-reporting hooks are called first, before data/env hooks, matching the same
first-to-last ordering used for imports (see imports-pattern.md).

8. Bad - vague generic name in zustand state (not just SDK/fetch results)

```ts
type CheckSpamEmailsStore = {
  results: TCheckSpamResult[]
  setResults: (results: TCheckSpamResult[]) => void
```

Good - vague generic name in zustand state

```ts
type CheckSpamEmailsStore = {
  spamCheckResults: TCheckSpamResult[]
  setSpamCheckResults: (spamCheckResults: TCheckSpamResult[]) => void
```

Rule #2's "no generic `result`/`results`" applies everywhere a value is named, not only to
`await`ed SDK responses. A zustand store field is read all over the codebase via
`useCheckSpamEmails()` destructuring, `.getState().results`, etc. — `results` alone gives no clue
what it's a list of. Name it for the domain concept it holds.

9. Bad - generic `resp`/`result` for a single awaited call

```ts
const resp = await selectDBLabels(encryptedEnvsClient, domain)
const result = await updateFolderOrder(encryptedEnvsClient, domain, orderedFolderNames)
```

Good - `response` for mutations, `<fnName>Resp` for select/get

```ts
const selectDBLabelsResp = await selectDBLabels(encryptedEnvsClient, domain)
const response = await updateFolderOrder(encryptedEnvsClient, domain, orderedFolderNames)
```

`resp`/`result` are just as vague as each other - neither says what was called. If the function
changes something (update/insert/delete/create/add/hadd/upd/set), name it `response`. If it reads
something (select/get), name it after the function itself: `<fnName>Resp`.

10. Bad - a local function in a useCallback/useMemo/useEffect deps array

```ts
const setEntityRedis = useCallback(
  async (entityRedisUrl: string) => {
    // ...
  },
  [userId, encryptedEnvsClient],
)

const handleSudoInput = useCallback(
  async (value: string) => {
    const response = await setEntityRedis(value)
    // ...
  },
  [sudoStep, userId, username, setEntityRedis],
)
```

Good - hold the called function in a ref, omit it from deps

```ts
const setEntityRedis = useCallback(
  async (entityRedisUrl: string) => {
    // ...
  },
  [userId, encryptedEnvsClient],
)

const setEntityRedisRef = useRef(setEntityRedis)
setEntityRedisRef.current = setEntityRedis

const handleSudoInput = useCallback(
  async (value: string) => {
    const response = await setEntityRedisRef.current(value)
    // ...
  },
  [sudoStep, userId, username],
)
```

Never add a locally-defined function (`useCallback`-wrapped, a plain `function` declaration, or a
`handleXxx`/`fetchXxx` returned from another hook) to a deps array — even if it's currently
memoized and stable. A later change to that function's own deps can silently make it unstable, and
nothing at the call site will warn you. `useState` setters and zustand store actions are exempt
(their identity is guaranteed stable by React/zustand); every other local function is not, no
matter how it's memoized upstream.
