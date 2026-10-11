## Commit naming

Format: `type: message`

Subject: one line, lowercase message, no period at the end, no scope.
Description: **required** — see the 🚨 TODO block below.

Exception: automatic merge subjects beginning with `Merge branch ` are allowed, including
`Merge branch 'feat/storybook' into development`. These merge messages do not require a description.

### Types (from most to least used)

| type    | when                                                         |
| ------- | ------------------------------------------------------------ |
| `fix`   | bug fix                                                      |
| `upd`   | update existing behavior/code (not a new feature, not a fix) |
| `style` | UI/CSS only change, no logic change                          |
| `docs`  | changes to files in `docs/` or `dev_readme-*.md`             |
| `feat`  | new feature                                                  |
| `chore` | renames, cleanup, types, logs, imports, non-behavior changes |

### Examples

- `fix: check spam email tg ntfcn`
- `fix: change lang via dropdown (no cookie)`
- `style: fix meeting info jumping`
- `style: green add product btn`
- `upd: J.png is now png (more rich)`
- `upd: max 300 chars in desc`
- `docs: no jargon`
- `feat: AI iteration mode`
- `-chore: night-run.sh`
- `chore: getCached -> getRedis`
- `chore: err -> error`
- `chore: eslint fix imports-order`

## 🚨 TODO — only what the AI has no way to do

A commit that only says what changed leaves me opening the diff to find out whether a manual step is
waiting. The description answers that first — but only when the step is genuinely mine.

**The test for an item: could the AI have done it itself? Then it is not a TODO.**

| Belongs in the block                            | Never in the block                               |
| ----------------------------------------------- | ------------------------------------------------ |
| the Supabase SQL editor, a migration to apply   | `pnpm` / `npm` / `npx` — the AI has a terminal   |
| a Vercel / Cloudflare / Stripe / PayPal console | cypress, playwright, vitest, storybook           |
| an env var, a secret, an API key                | eslint, prettier, `tsc`, a build                 |
| DNS, a domain, an OAuth consent screen          | editing a file, reading a diff                   |
| my inbox, my phone, a 2FA prompt                | `git add` / `git commit` / `git checkout`        |
| the runnable SQL, pasted into the body          | a `file:line` pointer to where the SQL lives     |
| `git push` when pushing IS the step             | anything it already did (that is a `-` why line) |

`git push` is denied in the AI's environment, so it belongs in the chat reply after every commit —
not in the body. It earns a numbered item only when the push itself is the step (a deploy to trigger,
a CI secret to pick up), never as a standing "and now push this" on each commit.

```
fix: restore users across databases

🚨 TODO

1. open the Supabase SQL editor -> paste the line below -> run it -> password_reset_required
   shows up in the 23_users table view

ALTER TABLE public."23_users"
  ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT false;

2. Vercel -> Settings -> Environment Variables -> Production -> add CRON_SECRET
```

**SQL goes IN the body — never behind a `file:line` pointer.** This one shipped and failed even
though the line number was right:

```
❌ 1. open dev_readme-supbase-sql.md:97 -> copy the password_reset_required ALTER TABLE block
     -> open the target Supabase Dashboard SQL Editor -> run it
```

That doc names the column twice: at `:94` inside `CREATE TABLE IF NOT EXISTS public."23_users"`,
which no-ops on a table that already exists, and at `:99` in the real `ALTER TABLE ... ADD COLUMN IF
NOT EXISTS`. The first one is what the eye lands on, so the whole step reads as already applied. His
words: _"AI should just write migration directly in commit description so I copy paste it from commit
description"_. The doc pointer may stay as a reference — what gets pasted comes from the commit.

**Each item is a chain, never a bare command.** `1. supabase functions deploy sendTgNtfcnAppointment`
is rejected: it says nothing about where to run it, what it changes, or how to tell it worked. An
item names WHERE to go, WHAT to do there, and HOW you know it worked.

**A make-work item is rejected** — this one shipped and is what the rule above exists for:

```
❌ 🚨 TODO

1. open a terminal in 23_store -> run pnpm exec cypress run --spec cypress/e2e/checkout.cy.ts
   -> expect 4 passing checkout tests and 0 failures
```

A perfect chain, and still wrong: the AI has that terminal. It runs the tests and the result becomes
a fact in the body — `- 4 checkout tests pass, 0 failures`.

**Nothing out of its reach? Then there is NO block.** Write the why on its own:

```
chore: drop unused deps

- removed 15 packages nothing in the repo imports
- tsc clean, 197 tests still pass
```

A filler `1. nothing - applied and verified here` is **rejected** for the same reason. Both shapes —
filler and make-work — train me to skip the block, and then the one that matters gets skipped too.

**The block is required whenever the commit touches** `.env*`, `env.d.ts`, a `migrations/` or
`supabase/` folder, a `.sql` file, or a `dev_readme*sql*` doc — those always leave a variable to set
or SQL to run. A file that merely holds the word (`app/libs/supabaseAdmin.ts`) does not count.

### Enforced, not remembered — two layers

**1. Before git runs.** `~/.claude/hooks/commit-rule-emoji-guard.py` (PreToolUse on Bash, wired in
`~/.claude/settings.json`) denies the commit when the body is missing, when a trigger path above is
staged without a `🚨 TODO`, when an item is filler, when an item is a terminal command the AI runs
itself, when an item names no out-of-reach place at all, when an SQL item leaves the statement in a
doc instead of the body, or when no item has an arrow chain. It reads
`-m`, `-am`, `-mX`, `--message=`, `-F` and `--file=`, and denies a bare `git commit` or
`--amend --no-edit` because those leave the message unreadable until after it lands.

A `command`, a "label" and any path or url are dropped before that out-of-reach match — otherwise
`check the button reads "Pay with PayPal"` counts as a PayPal step while being a file the AI edits.

**2. Husky before Git records the commit.** `.husky/commit-msg` checks every developer's message
with the same subject/type validator as CI. Only `fix`, `upd`, `style`, `docs`, `feat` and `chore`
are accepted; `test` is rejected. Automatic `Merge branch *` subjects are the explicit exception.
It then runs `.githooks/commit-msg` for the existing description
and trailer checks. Both hook sources are tracked. Git supplies the new message at `commit-msg`,
after `pre-commit`; type validation belongs there so it checks the current message.

### 🚨 After a fresh clone or an OS reinstall

The package's `prepare` script installs Husky during `pnpm install`. If dependencies were installed
with scripts disabled, run the prepare script once:

```bash
pnpm run prepare
```

`git config --get core.hooksPath` should report `.husky/_`. Avoid resetting it to `.githooks`, which
bypasses the Husky type check. The existing pre-push key check is delegated through Husky; assistants
must skip that hook when the user prohibits reading `.env.local`.

Layer 1 comes back with `~/.claude/` — the hooks are also copied to
`/home/kali/Documents/txt/claude-hooks/`.

### Rules

1. Keep the subject short - one line, plain words, no jargon (see code-patterns Naming conventions).
2. Renames go `old -> new` (e.g. `chore: fetch -> refetch/select/get`).
3. Don't prefix the message with a leading `-` (e.g. `-upd:`, `-chore:`) - this has slipped into history but is a typo, not a convention. Just use `type: message`.
4. Don't invent new types - if none of the 6 fit, ask before adding one.
5. No scopes (no `fix(dialer): ...`).
6. Every commit has a description. The `🚨 TODO` block only when a step is waiting that the AI has no
   way to do - see the section above. Never for something it could run itself.
7. A kebab-case name followed by `:` in the body IS an eslint rule name, so that line starts with 🟣
   (e.g. `🟣 imports-order:`).
8. Never add a Claude/Anthropic co-author trailer.
