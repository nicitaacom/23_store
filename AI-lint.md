# AI-lint

Checks eslint has no way to make, that the AI runs by reading the code instead.

Eslint sees one file at a time and only its syntax. Everything below needs either a second file, a
runtime fact, or a judgement about intent — so it is checked by hand, by the AI, on every change
that touches the listed area. A finding goes into the reply as a `file:line`, the same way a lint
report does.

Rules eslint DOES enforce live in [dev_readme-code-patterns.md](dev_readme-code-patterns.md) and
`eslint-rules/`. Nothing is repeated here.

<br/>

## 1. A gate on one entry point is not a gate

**Check:** every way into a gated feature returns early, not just the obvious one.

Eslint sees `if (!user?.id) return` in one function and is satisfied. It never asks whether a second
button reaches the same code with no check at all.

- **Found 2026-08-06:** `handleSubmit` in `AISearch/hooks/useAIChat.ts` gated the AI chat, while the
  ✨ button at `AISearch/ChatInput.tsx:44` called `generateImage` with no check — a visitor who was
  not signed in reached the upload and wrote into a guest folder meant to be unreachable.
- **How to check:** grep every caller of the gated function's siblings in the same hook, and every
  `onClick` in the components that hook feeds.

<br/>

## 2. An upload's folder key has to survive a restore

**Check:** no Storage path is built from `auth.users.id`, a session id, or any value a database
restore mints again.

- `auth.users.id` is a new uuid for the same person in a new Supabase project, so every folder named
  after it is left behind — see [dev_readme-backup.md](dev_readme-backup.md).
- The key is the account's email, slugged: `slugifyEmail(email)`.
- A visitor with no account gets their `deviceId`, and that bucket needs a sweep.
- **How to check:** grep `folder:` and `.upload(` and read what builds each path.

<br/>

## 3. A bucket with guest uploads needs a cron, or it grows for good

**Check:** every bucket a visitor without an account can write to has a matching `pg_cron` job in
`dev_readme-supbase-sql.md`.

- Deleting the row that holds the URL leaves the file in Storage. A guest ticket is deleted after a
  month and cascades to `23_messages`, and without a sweep the image stays for good.
- Today `23_support-guest-images` is the only such bucket, swept by `cleanup_guest_support_images`.
- **How to check:** for each bucket in `TBuckets.ts`, find the upload call site, then ask whether a
  visitor with no account reaches it.

<br/>

## 4. Two jobs must not fire at the same time

**Check:** a new `cron.schedule` does not share its minute with an existing one.

- Today: `cleanup_anonymous_tickets` daily 03:00, `weekly_ai_price_proposals` Monday 03:00,
  `cleanup_guest_support_images` Sunday 03:00, `keys_check` daily 04:00.
- **How to check:** grep `cron.schedule(` in `dev_readme-supbase-sql.md` and compare the 5-field
  expressions.

<br/>

## 5. A file name has to survive a second upload of the same thing

**Check:** the name is built from something that differs per upload.

Eslint catches the literal `new File([...], "image.png")` (🟣 `no-generic-image-file-name`). A name
built at runtime is invisible to it.

- A product image is `slug(title)-N.ext`, and N continues from the highest already in the folder —
  `resolveHighestProductImageIndex`, because a removed image keeps its file.
- A chat image is the moment it arrived, and two in the same second are separated by the dedupe path
  in `uploadImageFn`.
- **How to check:** ask what two uploads a second apart produce, and what the code does with the
  second one — overwrite, refuse, or number it.

<br/>

## 6. A slug must not merge two different names

**Check:** the character rules keep names that mean different things apart.

- `%` becomes `pct`, so `30%` and `30` stay two names. Dropping it merges them.
- Letters outside `a-z` are transliterated, not deleted: a Russian or Finnish title keeps its word.
  Deleting them turns `Lörtsy` into `L rtsy` and `сливки` into an empty string.
- **How to check:** run the real title through the real function, do not read the regex.

<br/>

## 7. A restored row's URL is only fixable from the row itself

**Check:** anything that stores an image URL can rebuild that URL's path from its own columns.

- The exported string names the old project's path. The folder the file sits in TODAY is rebuilt
  from the row: owner email + product id — `selectStorageFolder` in `backupConfig.ts`.
- A new URL-bearing column with no rule there stays unfixable after a restore.
- **How to check:** every column in `storageUrlColumns` has a `selectStorageFolder` that reaches it,
  or a stated reason it needs none.

<br/>

## 8. The owner of a file is not always the owner of the row

**Check:** the email a folder is keyed on belongs to whoever uploaded the file.

- **Found 2026-08-06:** `23_personalized_designs.owner_id` is the shop owner of the product, while
  `uploadDesignFn` writes under the BUYER's email — so the folder rule is keyed on `user_id`.
- **How to check:** read the insert route for the table, not the column name.

<br/>

## 9. A locale key set must match across all 4 files

**Check:** `en.ts`, `fi.ts`, `ru.ts` and `se.ts` hold the same keys.

- The line-number convention is retired; the KEY SET is what has to match.
- **How to check:** diff the key lists, not the files.

<br/>

## 10. A doc that names a count goes stale silently

**Check:** a number in a dev_readme still matches the code.

- **Found 2026-08-06:** `dev_readme-backup.md` said `BACKUP_BUCKETS` is 2 buckets long after it
  became 6, and drew a tree of a bucket that no longer exists.
- **How to check:** when a list in code grows, grep its name across `*.md`.
