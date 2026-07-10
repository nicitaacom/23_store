## Commit naming

Format: `type: message`

One line, lowercase message, no period at the end, no scope, no body.

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

### Rules

1. Keep the message short - one line, plain words, no jargon (see code-patterns Naming conventions).
2. Renames go `old -> new` (e.g. `chore: fetch -> refetch/select/get`).
3. Don't prefix the message with a leading `-` (e.g. `-upd:`, `-chore:`) - this has slipped into history but is a typo, not a convention. Just use `type: message`.
4. Don't invent new types - if none of the 6 fit, ask before adding one.
5. No scopes (no `fix(dialer): ...`), no multi-line commit bodies.
