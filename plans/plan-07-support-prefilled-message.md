# plan-07 — Wire useSupportPrefilledMessage into the support chat composer

**Priority:** P2
**Screenshot:** — (from categories dev_readme §5 TODO)
**Recommended model:** Sonnet · low thinking — one store read on mount, one decided question
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** plan-06 (MessageInput refactor lands first)

## §0 Why

Categories dev_readme §5 TODO: "Wire `useSupportPrefilledMessage` into `SupportButton`'s `MessageInput.tsx` — on mount, read `message`, set as `defaultValue`, call `clear()`."

Today `app/[locale]/(site)/components/CategoryPillBar.tsx:33` sets the store (`useSupportPrefilledMessage`, `app/store/ui/useSupportPrefilledMessage.ts` — fields `message` / `set` / `clear`), and nothing ever reads it — the prefilled text goes nowhere.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Store (message / set / clear) | `app/store/ui/useSupportPrefilledMessage.ts` |
| Writer | `app/[locale]/(site)/components/CategoryPillBar.tsx:12,33` |
| Reader to add | `app/components/ui/Inputs/MessageInput.tsx` (post plan-06) |
| Composer value store | `app/store/ui/useMessagesStore.ts` (`messageBodyValue`) |
| Chat window open state | `app/store/ui/useSupportDropdown.ts` |
| Doc §5 TODO to close | `app/[locale]/(site)/components/CategoryPillBar/dev_readme-categories.md` |

## §3 Expected behavior

```
BEFORE                                   AFTER
request-category click sets the message   request-category click sets the message
  -> nothing reads it ✗                    -> chat window opens, composer
user opens chat: empty composer              already holding that text; store
                                             cleared so it seeds exactly once ✓
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Seed on mount.** In `MessageInput`, on mount: read `message` from `useSupportPrefilledMessage`; when non-null, set it into `useMessagesStore.messageBodyValue` (only if the composer is empty — never overwrite typed text), then `clear()`. Effect follows the deps rules (store actions are exempt from the deps ban; no local functions in deps). Note: opening the chat window already works — `handleRequestCategory` (`CategoryPillBar.tsx:79-82`) calls `openDropdown()` right after setting the text, so this plan only adds the reading side. STOP — show Nikita the diff and wait for his review.
2. **Docs.** Close the §5 checkbox in `dev_readme-categories.md` and add one ASCII line in its §3 flow showing: request-category click → prefilled store → chat window opens → composer holds the text. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- The seed happens in `MessageInput` on mount (the TODO's own wording), reading through `useMessagesStore` — not a new prop drill.
- Seed only into an EMPTY composer; the store is cleared after one use.

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 7 (side effects in hooks), rule 15/deps-ref, rule 10 (zustand persist over localStorage — not needed here, store stays non-persisted).
- `good-bad-examples.md` — hook-call order (toast/error hooks first if any get added).
- `app/[locale]/(site)/components/CategoryPillBar/dev_readme-categories.md` — the doc this plan updates.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: [plan-08-i18n-sweep.md](plan-08-i18n-sweep.md)
