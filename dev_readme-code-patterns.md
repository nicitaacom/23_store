1. Keep code concise and prefer one-liners when readable.
2. Use ternaries where they improve clarity.
3. Prefer early returns.
4. Keep commented lines that already exist.
5. If a function can return an error, return a string error instead of throwing unless the file
   already uses a different pattern.
6. Put `style` first then `className` in HTML tag arguments.
7. Use `useEffect` only when needed and keep side effects in hooks, not components.
8. Each distinct realtime concern (typing indicator, ticket updates, message updates, etc.) must
   live in its own hook file. Do not merge multiple Pusher event groups into one hook or one
   component `useEffect`.
9. NEVER export const with classNames
10. NEVVER use `localstorage.setItem` or `localstorage.getItem` - use zustand store persist instead
11. Prefer `null` over empty strings where the absence of a value matters.
12. NEVER fetch data if you can get it from state (exception if it's something massive e.g email text_html)
13. Absolutely no short variable names like `e` or `err` or `idx` - user `error` or `index` instead (exception is e for event)
14. No jargon/clever/vivid words, in code AND in comments/docs. Use the plainest accurate word — for AI and humans both. If a word needs decoding, replace it. Banned words (not exhaustive — if a word could confuse a reader, it's banned even if not listed):
    - `blob`, `plain`, `orphan`, `dead`, `load` (as a verb standing alone), `server attaches` — use the real noun/verb for what the thing is.
    - `popup` — name what it actually is (notification/toast/card), not "thing that pops up".
    - `instructions` — for user-facing AI input, use `prompt` (exception: fine inside an AI system-prompt's own text, e.g. "follow user instructions").
    - `saving`/`isSaving` — say which backend: `updating`/`inserting` (Supabase), `setting` (Redis).
    - `arm`/`armed` — use `enable`.
    - `narrow`/`narrowed` — banned as a vague verb for "picked the error case out of a union" (spell out what happens); OK as TypeScript's own term for type narrowing.
    - `SDK call` — ambiguous (method call vs network request). Use `SDK method` or "SDK sends an API request".
    - `carrying`/`carries` — use `sending` or name the real mechanism.
    - `mutate`/`mutates` — use `update`/`upd` per the verb table below, not the generic CS term.
    - `closure` standalone/unexplained — say what's actually stale/captured instead of naming the JS concept and stopping there.
    - `"has loaded real data"` / `"real (fetched) state"` — name the actual hook and verb, e.g. "after `useSetSomething` has selected/got the data and set it into state".
    - **"can't X" / "cannot X" / "never can X"** — state the positive guarantee or the actual mechanism instead. E.g. not "can't diverge" → "always stays in sync"; not "a missed release can't wedge the cap" → "a missed release frees itself automatically"; not "sent can't be trashed" → "a sent email is not allowed to be trashed".
15. ABSOLUTELY NO ANY FUNCTIONS IN DEPS
