# plan-02 — DB: let anonymous ticket/message rows exist + monthly cleanup

**Priority:** P1
**Screenshot:** `TODO/make-it-so-I-can-change-db.jpg` — read it first
**Recommended model:** Sonnet · medium thinking — SQL + docs only, zero app code; the care point is writing idempotent copy-paste SQL
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

Importing data through the Supabase dashboard fails:

```
ERROR: 23503: insert or update on table "23_messages" violates foreign key constraint
"23_messages_sender_id_fkey" DETAIL: Key (sender_id)=(anonymousId_...) is not present in table "23_users".
```

The live DB has a constraint the schema doc explicitly forbids — `dev_readme-supbase-sql.md:108-110`:

```sql
-- ⚠️ sender_id is TEXT (no FK): an ANONYMOUS user can send a message, so it is NOT an auth.users(id).
-- Do NOT add a FK to 23_users(id) (uuid) — text cannot reference uuid.
sender_id TEXT NOT NULL,
```

Anonymous visitors open tickets with `sender_id = anonymousId_<uuid>` (see `app/utils/setAnonymousId.ts`), and those ids have no `23_users` row by design. The live DB drifted from the documented schema; the constraint blocks every import/edit that touches anonymous rows.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Documented `23_messages` schema (no FK on sender_id) | `dev_readme-supbase-sql.md:104-116` |
| `ticket_id` FK with `ON DELETE CASCADE` (cleanup relies on it) | `dev_readme-supbase-sql.md:107` |
| Restore-order note (7 tables) | `dev_readme-supbase-sql.md:323` |
| Backup doc with the false "always restore" claim | `dev_readme-backup.md:137` |
| Backup doc `BACKUP_TABLES` (5 tables — mismatch, see task 4) | `dev_readme-backup.md:27` |
| Anonymous id creation | `app/utils/setAnonymousId.ts` |

## §3 Expected behavior

```
BEFORE                                        AFTER
import rows with sender_id=anonymousId_*      import succeeds; anonymous rows live in
  -> FK violation, import fails  ✗              23_tickets / 23_messages  ✓

anonymous ticket idle forever                 pg_cron daily: anonymous-owned ticket where
                                              the ANONYMOUS USER wrote nothing for 1 month
                                              -> delete 3: the ticket, the anonymous user's
                                              messages, support's messages (CASCADE) ✓
                                              support replies alone keep NOTHING alive
                                              (tickets of signed-in users: untouched)
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **DONE.** Nikita ran the read-only query; live constraints on `23_messages`/`23_tickets` are only `23_tickets_pkey`, `23_messages_pkey`, `23_messages_ticket_id_fkey` (CASCADE) — no `23_messages_sender_id_fkey`, no FK on `23_tickets.owner_id`. Zero drift from the documented schema right now.
2. **DONE — no-op.** No drifted constraint exists to drop (see task 1). The FK from the original error screenshot is not present on the live table today; nothing to run.
3. **DONE.** Cleanup job (pg_cron) written below. Column names verified against `dev_readme-supbase-sql.md:77-116` (`23_tickets.id`/`owner_id`, `23_messages.ticket_id`/`sender_id`/`created_at`) — no changes needed from the draft.

   **Test first, by hand — SELECT only, deletes nothing:**
   ```sql
   SELECT ticket.id, ticket.owner_id, ticket.owner_username, ticket.created_at
   FROM public."23_tickets" ticket
   WHERE ticket.owner_id LIKE 'anonymousId_%'
     AND NOT EXISTS (
       SELECT 1 FROM public."23_messages" message
       WHERE message.ticket_id = ticket.id
         AND message.sender_id = ticket.owner_id -- only the anonymous user's own messages count as activity
         AND message.created_at > NOW() - INTERVAL '1 month'
     );
   ```
   Run this first and check the rows returned are actually the tickets you'd expect to delete (anonymous, inactive for 1+ month) before scheduling the job below.

   **Schedule the daily job — idempotent, copy-paste safe:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;

   SELECT cron.unschedule('cleanup_anonymous_tickets')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_anonymous_tickets');

   SELECT cron.schedule('cleanup_anonymous_tickets', '0 3 * * *', $$
     DELETE FROM public."23_tickets" ticket
     WHERE ticket.owner_id LIKE 'anonymousId_%'
       AND NOT EXISTS (
         SELECT 1 FROM public."23_messages" message
         WHERE message.ticket_id = ticket.id
           AND message.sender_id = ticket.owner_id -- only the anonymous user's own messages count as activity
           AND message.created_at > NOW() - INTERVAL '1 month'
       );
   $$);
   ```
   Deleting the ticket cascades to `23_messages` via `23_messages_ticket_id_fkey` (`ON DELETE CASCADE`, confirmed live in task 1) — both the anonymous owner's messages and any support replies on that ticket are removed with it. Tickets owned by signed-in users (`owner_id` not `LIKE 'anonymousId_%'`) are never touched.

   STOP — show Nikita the SQL and wait for his review before he schedules it.
4. **Docs.** In `dev_readme-supbase-sql.md`: add a "ANONYMOUS TICKETS CLEANUP" section holding the complete SQL from tasks 2-3 so a fresh Supabase project works from copy-paste alone (decision #2 below). In `dev_readme-backup.md`: correct line 137 (the FK existed and blocked restore until dropped — state what is true now), and note the `BACKUP_TABLES` (5 tables) vs restore-order (7 tables, `dev_readme-supbase-sql.md:323`) mismatch — align the two docs; whether `backupTables.ts` should also back up the categories tables is Nikita's call, flag it as a question in the diff. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- Nikita, verbatim: "actually anonymousId can open a support ticket but anonymous user id has no row in users table - so I'd need to keep rows in "messages" and "tickets" tables that are from anonymous users but delete them after 1 month of inactivity (i.e no new messages in THIS ticket from anonymous user) - only for anonymous user perform cron cleanup".
- Nikita, verbatim: "pg_cron in supabase but update dev_readme-supbase-sql.md so if something happens to this supbase I can copy paste SQL and it will work".
- Activity + delete scope, verbatim (blitz answer): "delete 3: ticket, messages from anonymous user, messages from support" — a support reply 2 weeks ago does NOT keep a ticket alive when the anonymous user's last message is over 1 month old.
- Identity separation, verbatim (blitz answer): "for anonymous users - use separated tickets - for authenticated users use separated tickets. So when user logs in - user no longer see tickets that were created when user was anonymous (tickets that created without userId but with anonymousId are no loger shown for authenticated user)" — `owner_id` is never rewritten to a real user id, so `LIKE 'anonymousId_%'` targets exactly the anonymous tickets and only them.
- The FK is dropped (not kept-with-seeded-users): the schema doc already forbids it.

## Code patterns to follow

- `dev_readme-code-patterns.md` — terminology (say "delete", not softer words; no "can't" in the docs you write).
- `good-bad-examples.md` — applies to the SQL aliases too: `ticket`/`message`, not `t`/`m`.
- `dev_readme-supbase-sql.md` + `dev_readme-backup.md` — the docs this plan updates; match their existing section style.

Read them BEFORE writing; validate the final diff line-by-line before saying done.

➡️ Next plan: [plan-03-ecosystem-links-icon-utm.md](plan-03-ecosystem-links-icon-utm.md)
